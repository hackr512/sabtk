-- Products: purchase cost + archive flag
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_cost numeric(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD CONSTRAINT products_purchase_cost_check CHECK (purchase_cost IS NULL OR purchase_cost >= 0);
CREATE INDEX IF NOT EXISTS products_active_idx ON public.products (is_active, is_archived);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category_id);

-- Plans: benefits list
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS benefits text[] NOT NULL DEFAULT '{}';

-- Memberships: allow suspension
ALTER TABLE public.memberships DROP CONSTRAINT memberships_status_check;
ALTER TABLE public.memberships ADD CONSTRAINT memberships_status_check
  CHECK (status = ANY (ARRAY['pending_payment','active','suspended','expired','cancelled','refunded']));
DROP INDEX IF EXISTS public.memberships_one_open_per_user;
CREATE UNIQUE INDEX memberships_one_open_per_user ON public.memberships (user_id)
  WHERE status = ANY (ARRAY['pending_payment','active','suspended']);
CREATE INDEX IF NOT EXISTS memberships_status_idx ON public.memberships (status);
CREATE INDEX IF NOT EXISTS membership_payments_status_idx ON public.membership_payments (status, created_at);

-- Table access (RLS still decides which rows)
GRANT SELECT ON public.products, public.categories, public.store_settings, public.membership_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.categories, public.store_settings TO authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.membership_plans, public.memberships, public.membership_cycles, public.membership_payments, public.membership_credit_ledger, public.order_status_events, public.user_roles TO authenticated;
GRANT ALL ON public.products, public.categories, public.store_settings, public.membership_plans, public.memberships, public.membership_cycles, public.membership_payments, public.membership_credit_ledger TO service_role;

-- Customer requests a plan (new or renewal). Creates a pending payment; nothing activates until payment is confirmed.
CREATE OR REPLACE FUNCTION public.membership_request(p_user uuid, p_plan uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_plan public.membership_plans%rowtype;
  m public.memberships%rowtype;
  v_pay uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  perform public.membership_refresh(p_user);
  update public.memberships set status = 'expired'
    where user_id = p_user and status = 'suspended' and current_period_end <= now();

  select * into v_plan from public.membership_plans where id = p_plan and is_active;
  if not found then raise exception 'PLAN_UNAVAILABLE'; end if;

  select * into m from public.memberships
    where user_id = p_user and status in ('pending_payment','active','suspended') for update;

  if not found then
    insert into public.memberships (user_id, plan_id, status) values (p_user, v_plan.id, 'pending_payment')
      returning * into m;
    insert into public.membership_payments (membership_id, user_id, plan_id, kind, amount, status, provider)
      values (m.id, p_user, v_plan.id, 'new', v_plan.monthly_price, 'pending', 'manual') returning id into v_pay;
    return jsonb_build_object('membership_id', m.id, 'payment_id', v_pay, 'kind', 'new', 'amount', v_plan.monthly_price);
  end if;

  if m.status = 'suspended' then raise exception 'MEMBERSHIP_SUSPENDED'; end if;
  if exists (select 1 from public.membership_payments where membership_id = m.id and status = 'pending') then
    raise exception 'ALREADY_PENDING';
  end if;

  if m.status = 'pending_payment' then
    update public.memberships set plan_id = v_plan.id where id = m.id;
    insert into public.membership_payments (membership_id, user_id, plan_id, kind, amount, status, provider)
      values (m.id, p_user, v_plan.id, 'new', v_plan.monthly_price, 'pending', 'manual') returning id into v_pay;
    return jsonb_build_object('membership_id', m.id, 'payment_id', v_pay, 'kind', 'new', 'amount', v_plan.monthly_price);
  end if;

  if exists (select 1 from public.membership_cycles where membership_id = m.id and status = 'scheduled') then
    raise exception 'ALREADY_RENEWED';
  end if;
  insert into public.membership_payments (membership_id, user_id, plan_id, kind, amount, status, provider)
    values (m.id, p_user, v_plan.id, 'renewal', v_plan.monthly_price, 'pending', 'manual') returning id into v_pay;
  return jsonb_build_object('membership_id', m.id, 'payment_id', v_pay, 'kind', 'renewal', 'amount', v_plan.monthly_price);
end; $$;

-- Admin (or the owner for their own pending request) changes a membership's status.
CREATE OR REPLACE FUNCTION public.membership_set_status(p_membership uuid, p_action text, p_actor uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  m public.memberships%rowtype;
  v_remaining int;
begin
  select * into m from public.memberships where id = p_membership for update;
  if not found then raise exception 'MEMBERSHIP_NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtext(m.user_id::text));

  if p_action = 'suspend' then
    if m.status <> 'active' then raise exception 'BAD_STATUS'; end if;
    update public.memberships set status = 'suspended' where id = m.id;
  elsif p_action = 'reactivate' then
    if m.status <> 'suspended' then raise exception 'BAD_STATUS'; end if;
    if m.current_period_end is null or m.current_period_end <= now() then raise exception 'PERIOD_ENDED'; end if;
    update public.memberships set status = 'active' where id = m.id;
  elsif p_action = 'cancel_at_period_end' then
    if m.status <> 'active' then raise exception 'BAD_STATUS'; end if;
    update public.memberships set cancel_at_period_end = true where id = m.id;
  elsif p_action = 'cancel' then
    if m.status not in ('pending_payment','active','suspended') then raise exception 'BAD_STATUS'; end if;
    update public.membership_payments set status = 'cancelled', note = coalesce(p_note, note), recorded_by = p_actor
      where membership_id = m.id and status = 'pending';
    if m.current_cycle_id is not null then
      v_remaining := greatest(public.membership_available_credits(m.current_cycle_id), 0);
      if v_remaining > 0 then
        insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note, actor)
        values (m.user_id, m.id, m.current_cycle_id, -v_remaining, 'expire', coalesce(p_note, 'Subscription cancelled'), p_actor);
      end if;
      update public.membership_cycles set status = 'closed', closed_at = now()
        where membership_id = m.id and status in ('active','scheduled');
    end if;
    update public.memberships set status = 'cancelled', cancelled_at = now() where id = m.id;
  else
    raise exception 'BAD_ACTION';
  end if;

  insert into public.audit_log (table_name, row_id, action, new_data, actor)
  values ('memberships', m.id, 'status:' || p_action, jsonb_build_object('note', p_note), p_actor);
end; $$;

REVOKE ALL ON FUNCTION public.membership_request(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.membership_set_status(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.membership_request(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.membership_set_status(uuid, text, uuid, text) TO service_role;