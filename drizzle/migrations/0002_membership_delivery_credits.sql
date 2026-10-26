-- ========== Monthly Delivery Membership ==========
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  monthly_price numeric(10,2) not null check (monthly_price > 0),
  included_credits int not null check (included_credits between 1 and 100),
  validity_days int not null default 30 check (validity_days between 7 and 366),
  min_basket numeric(10,2) not null default 0 check (min_basket >= 0),
  max_carry_forward int not null default 0 check (max_carry_forward between 0 and 100),
  zone_ids uuid[] not null default '{}',
  is_recommended boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.membership_plans to anon, authenticated;
grant all on public.membership_plans to service_role;
alter table public.membership_plans enable row level security;
create policy "Active plans are public" on public.membership_plans for select to anon, authenticated using (is_active);
create policy "Admins read all plans" on public.membership_plans for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger membership_plans_touch before update on public.membership_plans for each row execute function public.touch_updated_at();

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null references public.membership_plans(id),
  status text not null default 'pending_payment' check (status in ('pending_payment','active','expired','cancelled','refunded')),
  cancel_at_period_end boolean not null default false,
  current_cycle_id uuid,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index memberships_one_open_per_user on public.memberships(user_id) where status in ('pending_payment','active');
create index memberships_user_idx on public.memberships(user_id, created_at desc);
grant select on public.memberships to authenticated;
grant all on public.memberships to service_role;
alter table public.memberships enable row level security;
create policy "Own memberships select" on public.memberships for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create trigger memberships_touch before update on public.memberships for each row execute function public.touch_updated_at();

create table public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id),
  user_id uuid not null,
  plan_id uuid not null references public.membership_plans(id),
  kind text not null check (kind in ('new','renewal')),
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded')),
  method text check (method in ('cash','bank_transfer','easypaisa','jazzcash','card')),
  provider text not null default 'manual',
  provider_reference text,
  cycle_id uuid,
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_amount numeric(10,2),
  recorded_by uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index membership_payments_one_pending on public.membership_payments(membership_id) where status = 'pending';
create unique index membership_payments_reference_once on public.membership_payments(provider, provider_reference) where provider_reference is not null;
create index membership_payments_user_idx on public.membership_payments(user_id, created_at desc);
grant select on public.membership_payments to authenticated;
grant all on public.membership_payments to service_role;
alter table public.membership_payments enable row level security;
create policy "Own membership payments select" on public.membership_payments for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create trigger membership_payments_touch before update on public.membership_payments for each row execute function public.touch_updated_at();

create table public.membership_cycles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id),
  user_id uuid not null,
  plan_id uuid not null references public.membership_plans(id),
  payment_id uuid references public.membership_payments(id),
  cycle_number int not null,
  plan_name text not null,
  price numeric(10,2) not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  credits_granted int not null,
  credits_carried int not null default 0,
  min_basket numeric(10,2) not null default 0,
  max_carry_forward int not null default 0,
  zone_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('scheduled','active','closed','refunded')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (membership_id, cycle_number)
);
create index membership_cycles_user_idx on public.membership_cycles(user_id, period_start desc);
grant select on public.membership_cycles to authenticated;
grant all on public.membership_cycles to service_role;
alter table public.membership_cycles enable row level security;
create policy "Own membership cycles select" on public.membership_cycles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

alter table public.memberships add constraint memberships_current_cycle_fk foreign key (current_cycle_id) references public.membership_cycles(id);
alter table public.membership_payments add constraint membership_payments_cycle_fk foreign key (cycle_id) references public.membership_cycles(id);

create table public.membership_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  membership_id uuid not null references public.memberships(id),
  cycle_id uuid not null references public.membership_cycles(id),
  order_id uuid references public.orders(id),
  delta int not null,
  kind text not null check (kind in ('grant','carry_forward','reserve','consume','release','restore','expire','adjust','refund_void')),
  note text,
  actor uuid,
  created_at timestamptz not null default now()
);
create unique index membership_ledger_order_kind_once on public.membership_credit_ledger(order_id, kind) where order_id is not null;
create index membership_ledger_cycle_idx on public.membership_credit_ledger(cycle_id);
create index membership_ledger_user_idx on public.membership_credit_ledger(user_id, created_at desc);
grant select on public.membership_credit_ledger to authenticated;
grant all on public.membership_credit_ledger to service_role;
alter table public.membership_credit_ledger enable row level security;
create policy "Own credit ledger select" on public.membership_credit_ledger for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Ledger is append-only: every addition, deduction and reversal stays on record.
create or replace function public.membership_ledger_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'The delivery-credit ledger is append-only';
end; $$;
create trigger membership_ledger_no_update before update or delete on public.membership_credit_ledger for each row execute function public.membership_ledger_immutable();

create trigger audit_membership_plans after insert or update or delete on public.membership_plans for each row execute function public.audit_row();
create trigger audit_memberships after insert or update or delete on public.memberships for each row execute function public.audit_row();
create trigger audit_membership_payments after insert or update or delete on public.membership_payments for each row execute function public.audit_row();
create trigger audit_membership_cycles after insert or update or delete on public.membership_cycles for each row execute function public.audit_row();

-- Orders: which membership cycle paid the delivery fee, and the credit's state.
alter table public.orders
  add column membership_cycle_id uuid references public.membership_cycles(id),
  add column membership_credit_status text not null default 'none' check (membership_credit_status in ('none','reserved','consumed','released','restored')),
  add column delivery_fee_waived numeric(10,2) not null default 0 check (delivery_fee_waived >= 0);

insert into public.store_settings (key, value) values
  ('membership_credit_mode', 'auto'),
  ('membership_refund_window_days', '3'),
  ('membership_restore_credit_on_refund', 'true'),
  ('membership_online_payment_enabled', 'false')
on conflict (key) do nothing;

insert into public.membership_plans (slug, name, description, monthly_price, included_credits, is_recommended, sort_order) values
  ('starter', 'Starter', 'For small households that order about once a week.', 499, 4, false, 1),
  ('smart-saver', 'Smart Saver', 'Our most popular plan for regular top-up orders.', 899, 7, true, 2),
  ('family-plus', 'Family Plus', 'For big families that order fresh items often.', 1300, 10, false, 3)
on conflict (slug) do nothing;

-- ========== Credit helpers (service role only) ==========
create or replace function public.membership_available_credits(p_cycle uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.membership_credit_ledger where cycle_id = p_cycle
$$;

-- Rolls finished cycles over: expires unused credits, carries forward what the plan allows,
-- activates a paid renewal, or marks the membership expired/cancelled.
create or replace function public.membership_refresh(p_user uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  m public.memberships%rowtype;
  v_old public.membership_cycles%rowtype;
  v_next public.membership_cycles%rowtype;
  v_remaining int;
  v_carry int;
begin
  for m in
    select * from public.memberships
    where status = 'active' and current_period_end <= now() and (p_user is null or user_id = p_user)
    for update
  loop
    select * into v_old from public.membership_cycles where id = m.current_cycle_id;
    v_remaining := greatest(public.membership_available_credits(v_old.id), 0);
    select * into v_next from public.membership_cycles
      where membership_id = m.id and status = 'scheduled' order by cycle_number limit 1;

    if found then
      v_carry := least(v_remaining, v_old.max_carry_forward);
    else
      v_carry := 0;
    end if;

    if v_remaining > 0 then
      insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note)
      values (m.user_id, m.id, v_old.id, -v_remaining, 'expire',
        case when v_carry > 0 then 'Cycle ended: ' || v_carry || ' credit(s) carried forward, rest expired'
             else 'Cycle ended: unused credits expired' end);
    end if;
    update public.membership_cycles set status = 'closed', closed_at = now() where id = v_old.id;

    if v_next.id is not null then
      update public.membership_cycles set status = 'active', credits_carried = v_carry where id = v_next.id;
      insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note)
      values (m.user_id, m.id, v_next.id, v_next.credits_granted, 'grant', 'Renewal: ' || v_next.plan_name || ' credits');
      if v_carry > 0 then
        insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note)
        values (m.user_id, m.id, v_next.id, v_carry, 'carry_forward', 'Carried forward from previous cycle');
      end if;
      update public.memberships set current_cycle_id = v_next.id, plan_id = v_next.plan_id,
        current_period_start = v_next.period_start, current_period_end = v_next.period_end
      where id = m.id;
    else
      update public.memberships
        set status = case when m.cancel_at_period_end then 'cancelled' else 'expired' end,
            cancelled_at = case when m.cancel_at_period_end then coalesce(m.cancelled_at, now()) else m.cancelled_at end
      where id = m.id;
    end if;
    v_next := null;
  end loop;
end; $$;

-- Records a verified payment and grants credits. Never called without a real payment.
create or replace function public.membership_record_payment(p_payment uuid, p_method text, p_reference text, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pay public.membership_payments%rowtype;
  m public.memberships%rowtype;
  v_plan public.membership_plans%rowtype;
  v_num int;
  v_start timestamptz;
  v_cycle uuid;
  v_status text;
begin
  select * into v_pay from public.membership_payments where id = p_payment for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_pay.status <> 'pending' then raise exception 'PAYMENT_NOT_PENDING'; end if;

  perform pg_advisory_xact_lock(hashtext(v_pay.user_id::text));
  perform public.membership_refresh(v_pay.user_id);

  select * into m from public.memberships where id = v_pay.membership_id for update;
  select * into v_plan from public.membership_plans where id = v_pay.plan_id;
  select coalesce(max(cycle_number), 0) + 1 into v_num from public.membership_cycles where membership_id = m.id;

  if m.status = 'active' and v_pay.kind = 'renewal' then
    v_start := m.current_period_end;
    v_status := 'scheduled';
  elsif m.status = 'pending_payment' then
    v_start := now();
    v_status := 'active';
  else
    raise exception 'MEMBERSHIP_NOT_PAYABLE';
  end if;

  insert into public.membership_cycles (membership_id, user_id, plan_id, payment_id, cycle_number, plan_name, price,
    period_start, period_end, credits_granted, min_basket, max_carry_forward, zone_ids, status)
  values (m.id, m.user_id, v_plan.id, v_pay.id, v_num, v_plan.name, v_pay.amount,
    v_start, v_start + make_interval(days => v_plan.validity_days), v_plan.included_credits,
    v_plan.min_basket, v_plan.max_carry_forward, v_plan.zone_ids, v_status)
  returning id into v_cycle;

  update public.membership_payments
    set status = 'paid', method = p_method, provider_reference = nullif(p_reference, ''), paid_at = now(),
        recorded_by = p_actor, cycle_id = v_cycle
  where id = v_pay.id;

  if v_status = 'active' then
    insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note, actor)
    values (m.user_id, m.id, v_cycle, v_plan.included_credits, 'grant', v_plan.name || ' credits for cycle ' || v_num, p_actor);
    update public.memberships set status = 'active', plan_id = v_plan.id, current_cycle_id = v_cycle,
      current_period_start = v_start, current_period_end = v_start + make_interval(days => v_plan.validity_days),
      cancel_at_period_end = false
    where id = m.id;
  else
    update public.memberships set cancel_at_period_end = false where id = m.id;
  end if;

  return jsonb_build_object('cycle_id', v_cycle, 'status', v_status);
end; $$;

create or replace function public.membership_refund_payment(p_payment uuid, p_amount numeric, p_note text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pay public.membership_payments%rowtype;
  v_cycle public.membership_cycles%rowtype;
  v_remaining int;
begin
  select * into v_pay from public.membership_payments where id = p_payment for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_pay.status <> 'paid' then raise exception 'PAYMENT_NOT_PAID'; end if;
  if p_amount <= 0 or p_amount > v_pay.amount then raise exception 'BAD_REFUND_AMOUNT'; end if;
  perform pg_advisory_xact_lock(hashtext(v_pay.user_id::text));

  update public.membership_payments set status = 'refunded', refunded_at = now(), refund_amount = p_amount,
    note = nullif(p_note, ''), recorded_by = p_actor where id = v_pay.id;

  select * into v_cycle from public.membership_cycles where id = v_pay.cycle_id for update;
  if found and v_cycle.status in ('active','scheduled') then
    v_remaining := greatest(public.membership_available_credits(v_cycle.id), 0);
    if v_remaining > 0 then
      insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note, actor)
      values (v_cycle.user_id, v_cycle.membership_id, v_cycle.id, -v_remaining, 'refund_void', 'Payment refunded: remaining credits removed', p_actor);
    end if;
    update public.membership_cycles set status = 'refunded', closed_at = now() where id = v_cycle.id;
    if v_cycle.status = 'active' then
      update public.memberships set status = 'refunded', cancelled_at = now() where id = v_cycle.membership_id;
    end if;
  end if;
end; $$;

create or replace function public.membership_adjust_credits(p_cycle uuid, p_delta int, p_note text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_cycle public.membership_cycles%rowtype;
begin
  if p_delta = 0 or abs(p_delta) > 50 then raise exception 'BAD_ADJUSTMENT'; end if;
  select * into v_cycle from public.membership_cycles where id = p_cycle for update;
  if not found or v_cycle.status not in ('active','scheduled') then raise exception 'CYCLE_NOT_OPEN'; end if;
  perform pg_advisory_xact_lock(hashtext(v_cycle.user_id::text));
  if public.membership_available_credits(p_cycle) + p_delta < 0 then raise exception 'BALANCE_BELOW_ZERO'; end if;
  insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note, actor)
  values (v_cycle.user_id, v_cycle.membership_id, p_cycle, p_delta, 'adjust', p_note, p_actor);
end; $$;

create or replace function public.membership_report()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'active', (select count(*) from public.memberships where status = 'active'),
    'pending', (select count(*) from public.membership_payments where status = 'pending'),
    'cancelling', (select count(*) from public.memberships where status = 'active' and cancel_at_period_end),
    'expired', (select count(*) from public.memberships where status in ('expired','cancelled','refunded')),
    'revenue_paid', (select coalesce(sum(amount), 0) from public.membership_payments where status in ('paid','refunded')),
    'refunded', (select coalesce(sum(refund_amount), 0) from public.membership_payments where status = 'refunded'),
    'credits_granted', (select coalesce(sum(delta), 0) from public.membership_credit_ledger where kind in ('grant','carry_forward')),
    'credits_consumed', (select count(*) from public.orders where membership_credit_status = 'consumed'),
    'credits_reserved', (select count(*) from public.orders where membership_credit_status = 'reserved'),
    'redemption_cost', (select coalesce(sum(delivery_fee_waived), 0) from public.orders where membership_credit_status = 'consumed'),
    'pending_cost', (select coalesce(sum(delivery_fee_waived), 0) from public.orders where membership_credit_status = 'reserved')
  )
$$;

revoke all on function public.membership_available_credits(uuid) from public, anon, authenticated;
revoke all on function public.membership_refresh(uuid) from public, anon, authenticated;
revoke all on function public.membership_record_payment(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.membership_refund_payment(uuid, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.membership_adjust_credits(uuid, int, text, uuid) from public, anon, authenticated;
revoke all on function public.membership_report() from public, anon, authenticated;
grant execute on function public.membership_available_credits(uuid) to service_role;
grant execute on function public.membership_refresh(uuid) to service_role;
grant execute on function public.membership_record_payment(uuid, text, text, uuid) to service_role;
grant execute on function public.membership_refund_payment(uuid, numeric, text, uuid) to service_role;
grant execute on function public.membership_adjust_credits(uuid, int, text, uuid) to service_role;
grant execute on function public.membership_report() to service_role;

-- ========== Orders: reserve a credit at placement (inside the per-customer lock) ==========
create or replace function public.create_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := (p->>'user_id')::uuid;
  v_order_id uuid;
  v_number text;
  v_item jsonb;
  v_points int := coalesce((p->>'points_redeemed')::int, 0);
  v_balance int;
  v_updated int;
  v_waived numeric := coalesce((p->>'delivery_fee_waived')::numeric, 0);
  v_cycle public.membership_cycles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  if v_points > 0 then
    select coalesce(sum(points),0) into v_balance from public.loyalty_ledger where user_id = v_user;
    if v_balance < v_points then
      raise exception 'INSUFFICIENT_POINTS';
    end if;
  end if;

  if v_waived > 0 then
    if (p->>'delivery_fee')::numeric <> 0 then raise exception 'MEMBERSHIP_BAD_FEE'; end if;
    perform public.membership_refresh(v_user);
    select c.* into v_cycle from public.memberships m
      join public.membership_cycles c on c.id = m.current_cycle_id
      where m.user_id = v_user and m.status = 'active' and c.status = 'active'
        and now() >= c.period_start and now() < c.period_end
      for update of m;
    if not found then raise exception 'NO_MEMBERSHIP'; end if;
    if (p->>'subtotal')::numeric < v_cycle.min_basket then raise exception 'MEMBERSHIP_MIN_BASKET'; end if;
    if cardinality(v_cycle.zone_ids) > 0 and not ((p->>'zone_id')::uuid = any(v_cycle.zone_ids)) then
      raise exception 'MEMBERSHIP_ZONE';
    end if;
    if public.membership_available_credits(v_cycle.id) < 1 then raise exception 'NO_MEMBERSHIP_CREDIT'; end if;
  end if;

  v_number := 'SBT-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-' || nextval('public.order_number_seq');

  insert into public.orders (order_number, user_id, payment_method, customer_name, phone, zone_id, city, area, address_line, instructions,
    delivery_date, delivery_window, subtotal, discount_total, delivery_fee, total, eligible_points_subtotal, points_to_earn,
    points_redeemed, reward_id, promo_code, notes, membership_cycle_id, membership_credit_status, delivery_fee_waived)
  values (v_number, v_user, p->>'payment_method', p->>'customer_name', p->>'phone', (p->>'zone_id')::uuid, p->>'city', p->>'area',
    p->>'address_line', nullif(p->>'instructions',''), (p->>'delivery_date')::date, p->>'delivery_window',
    (p->>'subtotal')::numeric, (p->>'discount_total')::numeric, (p->>'delivery_fee')::numeric, (p->>'total')::numeric,
    (p->>'eligible_points_subtotal')::numeric, (p->>'points_to_earn')::int, v_points,
    nullif(p->>'reward_id','')::uuid, nullif(p->>'promo_code',''), nullif(p->>'notes',''),
    case when v_waived > 0 then v_cycle.id end,
    case when v_waived > 0 then 'reserved' else 'none' end,
    v_waived)
  returning id into v_order_id;

  if v_waived > 0 then
    insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, order_id, delta, kind, note, actor)
    values (v_user, v_cycle.membership_id, v_cycle.id, v_order_id, -1, 'reserve', 'Delivery credit held for order ' || v_number, v_user);
  end if;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    update public.products set stock_quantity = stock_quantity - (v_item->>'quantity')::int
      where id = (v_item->>'product_id')::uuid and is_active and stock_quantity >= (v_item->>'quantity')::int;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'OUT_OF_STOCK:%', v_item->>'name';
    end if;
    insert into public.order_items (order_id, product_id, name, brand, pack_size, image, unit_price, quantity, line_total, is_reward)
    values (v_order_id, (v_item->>'product_id')::uuid, v_item->>'name', nullif(v_item->>'brand',''), v_item->>'pack_size',
      nullif(v_item->>'image',''), (v_item->>'unit_price')::numeric, (v_item->>'quantity')::int, (v_item->>'line_total')::numeric,
      coalesce((v_item->>'is_reward')::boolean, false));
  end loop;

  if v_points > 0 then
    insert into public.loyalty_ledger (user_id, points, kind, order_id, description)
    values (v_user, -v_points, 'redeem', v_order_id, 'Redeemed on order ' || v_number);
  end if;

  if nullif(p->>'promo_code','') is not null then
    update public.promo_codes set used_count = used_count + 1 where code = p->>'promo_code';
  end if;

  insert into public.order_status_events (order_id, status, note, actor) values (v_order_id, 'pending_confirmation', 'Order placed', v_user);

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number);
end; $$;
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

-- ========== Orders: consume on delivery, return on cancellation/refund ==========
create or replace function public.orders_membership_credit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_restore boolean;
begin
  -- Membership fields are owned by the database, never edited directly.
  new.membership_cycle_id := old.membership_cycle_id;
  new.delivery_fee_waived := old.delivery_fee_waived;
  new.membership_credit_status := old.membership_credit_status;

  if new.status is not distinct from old.status or old.membership_cycle_id is null then
    return new;
  end if;

  if new.status = 'delivered' and old.membership_credit_status = 'reserved' then
    insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, order_id, delta, kind, note, actor)
    select new.user_id, c.membership_id, c.id, new.id, 0, 'consume', 'Credit used: order ' || new.order_number || ' delivered', auth.uid()
    from public.membership_cycles c where c.id = old.membership_cycle_id
    on conflict (order_id, kind) where order_id is not null do nothing;
    new.membership_credit_status := 'consumed';
  elsif new.status in ('cancelled','refunded') and old.membership_credit_status = 'reserved' then
    insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, order_id, delta, kind, note, actor)
    select new.user_id, c.membership_id, c.id, new.id, 1, 'release', 'Credit returned: order ' || new.order_number || ' ' || new.status, auth.uid()
    from public.membership_cycles c where c.id = old.membership_cycle_id
    on conflict (order_id, kind) where order_id is not null do nothing;
    new.membership_credit_status := 'released';
  elsif new.status = 'refunded' and old.membership_credit_status = 'consumed' then
    select coalesce((select value from public.store_settings where key = 'membership_restore_credit_on_refund'), 'true') = 'true' into v_restore;
    if v_restore then
      insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, order_id, delta, kind, note, actor)
      select new.user_id, c.membership_id, c.id, new.id, 1, 'restore', 'Credit restored: order ' || new.order_number || ' refunded', auth.uid()
      from public.membership_cycles c where c.id = old.membership_cycle_id
      on conflict (order_id, kind) where order_id is not null do nothing;
      new.membership_credit_status := 'restored';
    end if;
  end if;
  return new;
end; $$;
create trigger orders_membership_credit before update on public.orders for each row execute function public.orders_membership_credit();
