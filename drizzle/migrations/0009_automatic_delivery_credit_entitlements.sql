ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_credit_remaining_at_order integer;
DO $patch$ DECLARE s text; BEGIN
s:=pg_get_functiondef('public.create_order(jsonb)'::regprocedure);
s:=replace(s,'    if not found then raise exception ''NO_MEMBERSHIP''; end if;', $new$    if nullif(p->>'checkout_pending_cycle','') is not null then
      select c.* into v_cycle from public.membership_cycles c join public.membership_payments pay on pay.id=c.payment_id join public.memberships m on m.id=c.membership_id
      where c.id=(p->>'checkout_pending_cycle')::uuid and c.user_id=v_user and c.status='scheduled' and pay.status='pending' and m.status in ('pending_payment','active')
      and not exists(select 1 from public.membership_credit_ledger where cycle_id=c.id and kind='reserve') for update of m;
    end if;
    if v_cycle.id is null then raise exception 'NO_MEMBERSHIP'; end if;$new$);
EXECUTE s;
s:=pg_get_functiondef('public.membership_record_payment(uuid,text,text,uuid)'::regprocedure);
s:=replace(s,'  if v_pay.status <> ''pending'' then raise exception ''PAYMENT_NOT_PENDING''; end if;', $new$  if v_pay.status='paid' then return jsonb_build_object('cycle_id',v_pay.cycle_id,'status','already_paid'); end if;
  if v_pay.status <> 'pending' then raise exception 'PAYMENT_NOT_PENDING'; end if;$new$);
s:=replace(s,'  insert into public.membership_cycles (membership_id, user_id, plan_id, payment_id, cycle_number, plan_name, price,', $new$  select id into v_cycle from public.membership_cycles where payment_id=v_pay.id;
  if v_cycle is not null then
    update public.membership_cycles set period_end=v_start+(period_end-period_start),period_start=v_start,status=v_status where id=v_cycle;
    select credits_granted,min_basket,max_carry_forward,zone_ids,plan_name into v_plan.included_credits,v_plan.min_basket,v_plan.max_carry_forward,v_plan.zone_ids,v_plan.name from public.membership_cycles where id=v_cycle;
  else
  insert into public.membership_cycles (membership_id, user_id, plan_id, payment_id, cycle_number, plan_name, price,$new$);
s:=replace(s,'  returning id into v_cycle;','  returning id into v_cycle; end if;');
s:=replace(s,'    insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note, actor)', $new$    if not exists(select 1 from public.membership_credit_ledger where cycle_id=v_cycle and kind='grant') then
    insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note, actor)$new$);
s:=replace(s,'    update public.memberships set status = ''active''','    end if; update public.memberships set status = ''active''');
s:=replace(s,'current_period_end = v_start + make_interval(days => v_plan.validity_days)','current_period_end = (select period_end from public.membership_cycles where id=v_cycle)'); EXECUTE s;
s:=pg_get_functiondef('public.membership_refresh(uuid)'::regprocedure);
s:=replace(s,'where membership_id = m.id and status = ''scheduled''', $new$where membership_id = m.id and status = 'scheduled' and exists(select 1 from public.membership_payments pay where pay.id=membership_cycles.payment_id and pay.status='paid')$new$);
s:=replace(s,$old$      insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note)
      values (m.user_id, m.id, v_next.id, v_next.credits_granted, 'grant', 'Renewal: ' || v_next.plan_name || ' credits');$old$, $new$      if not exists(select 1 from public.membership_credit_ledger where cycle_id=v_next.id and kind='grant') then
      insert into public.membership_credit_ledger (user_id, membership_id, cycle_id, delta, kind, note)
      values (m.user_id, m.id, v_next.id, v_next.credits_granted, 'grant', 'Renewal: ' || v_next.plan_name || ' credits'); end if;$new$); EXECUTE s;
END; $patch$;
CREATE OR REPLACE FUNCTION public.create_order_with_plan(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_plan public.membership_plans%rowtype; c public.membership_cycles%rowtype; req jsonb; result jsonb; uid uuid := (p->>'user_id')::uuid; pay uuid; cid uuid; eligible boolean := false; fee numeric := case when (p->>'subtotal')::numeric>0 then 150 else 0 end; price numeric := 0;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(uid::text)); PERFORM public.membership_refresh(uid); p := p - 'checkout_pending_cycle';
 IF nullif(p->>'delivery_plan_id','') IS NOT NULL THEN
  IF EXISTS(select 1 from public.store_settings where key='membership_enabled' and value='false') THEN RAISE EXCEPTION 'PLAN_UNAVAILABLE'; END IF;
  SELECT * INTO v_plan FROM public.membership_plans WHERE id=(p->>'delivery_plan_id')::uuid and is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_UNAVAILABLE'; END IF;
  IF (p->>'delivery_plan_expected_price')::numeric IS DISTINCT FROM v_plan.monthly_price THEN RAISE EXCEPTION 'PLAN_PRICE_CHANGED'; END IF;
  req := public.checkout_plan_request(uid,v_plan.id); pay := (req->>'payment_id')::uuid; price := v_plan.monthly_price;
  SELECT id INTO cid FROM public.membership_cycles WHERE payment_id=pay;
  IF cid IS NULL THEN
   INSERT INTO public.membership_cycles(membership_id,user_id,plan_id,payment_id,cycle_number,plan_name,price,period_start,period_end,credits_granted,min_basket,max_carry_forward,zone_ids,status)
   VALUES((req->>'membership_id')::uuid,uid,v_plan.id,pay,(select coalesce(max(cycle_number),0)+1 from public.membership_cycles where membership_id=(req->>'membership_id')::uuid),v_plan.name,price,now(),now()+make_interval(days=>v_plan.validity_days),v_plan.included_credits,v_plan.min_basket,v_plan.max_carry_forward,v_plan.zone_ids,'scheduled') returning id into cid;
   INSERT INTO public.membership_credit_ledger(user_id,membership_id,cycle_id,delta,kind,note,actor) VALUES(uid,(req->>'membership_id')::uuid,cid,v_plan.included_credits,'grant','Purchased credits; unavailable until payment confirmation',uid);
  END IF;
  eligible := fee>0 and (p->>'subtotal')::numeric>=v_plan.min_basket and (cardinality(v_plan.zone_ids)=0 or (p->>'zone_id')::uuid=any(v_plan.zone_ids));
  IF eligible THEN p := jsonb_set(p,'{checkout_pending_cycle}',to_jsonb(cid::text)); END IF;
 ELSE
  SELECT cyc.* INTO c FROM public.memberships m JOIN public.membership_cycles cyc ON cyc.id=m.current_cycle_id JOIN public.membership_payments paid ON paid.id=cyc.payment_id AND paid.status='paid'
  WHERE m.user_id=uid AND m.status='active' AND cyc.status='active' AND now()>=cyc.period_start AND now()<cyc.period_end FOR UPDATE OF m;
  eligible := c.id is not null and fee>0 and public.membership_available_credits(c.id)>0 and (p->>'subtotal')::numeric>=c.min_basket and (cardinality(c.zone_ids)=0 or (p->>'zone_id')::uuid=any(c.zone_ids));
  IF eligible THEN cid:=c.id; pay:=c.payment_id; SELECT * INTO v_plan FROM public.membership_plans WHERE id=c.plan_id; END IF;
 END IF;
 p := jsonb_set(p,'{delivery_fee}',to_jsonb(case when eligible then 0 else fee end)); p := jsonb_set(p,'{delivery_fee_waived}',to_jsonb(case when eligible then fee else 0 end));
 p := jsonb_set(p,'{total}',to_jsonb((p->>'subtotal')::numeric-(p->>'discount_total')::numeric+(case when eligible then 0 else fee end)+price));
 result := public.create_order(p);
 IF v_plan.id IS NOT NULL THEN
  UPDATE public.orders SET delivery_plan_id=v_plan.id,delivery_plan_price=price,delivery_plan_selected_at=now(),delivery_plan_payment_id=pay,delivery_credit_remaining_at_order=case when eligible then public.membership_available_credits(cid) end,
   delivery_plan_snapshot=jsonb_build_object('id',v_plan.id,'name',coalesce(c.plan_name,v_plan.name),'price',coalesce(c.price,v_plan.monthly_price),'credits',coalesce(c.credits_granted,v_plan.included_credits),'validityDays',coalesce(extract(day from c.period_end-c.period_start)::int,v_plan.validity_days),'benefits',v_plan.benefits,'minBasket',coalesce(c.min_basket,v_plan.min_basket),'maxCarryForward',coalesce(c.max_carry_forward,v_plan.max_carry_forward),'zoneIds',coalesce(c.zone_ids,v_plan.zone_ids)) WHERE id=(result->>'order_id')::uuid;
  IF price>0 THEN UPDATE public.membership_payments SET note='Included in COD order '||(result->>'order_number'),provider_reference=result->>'order_number',cycle_id=cid WHERE id=pay; END IF;
 END IF; RETURN result;
END; $$;
CREATE OR REPLACE FUNCTION public.order_delivery_plan_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pay public.membership_payments%rowtype;
BEGIN
 IF new.delivery_plan_payment_id IS NULL OR (new.status IS NOT DISTINCT FROM old.status AND new.payment_status IS NOT DISTINCT FROM old.payment_status) THEN RETURN new; END IF;
 SELECT * INTO v_pay FROM public.membership_payments WHERE id=new.delivery_plan_payment_id FOR UPDATE;
 IF new.status='delivered' AND new.payment_status='paid' AND v_pay.status='pending' THEN PERFORM public.membership_record_payment(v_pay.id,'cash',new.order_number,auth.uid());
 ELSIF new.status in ('cancelled','refunded') AND v_pay.status='pending' THEN
  UPDATE public.membership_payments SET status='cancelled',note='Cancelled with order '||new.order_number WHERE id=v_pay.id;
  UPDATE public.membership_cycles SET status='closed',closed_at=now() WHERE payment_id=v_pay.id;
  IF v_pay.kind='new' THEN UPDATE public.memberships SET status='cancelled',cancelled_at=now() WHERE id=v_pay.membership_id AND status='pending_payment'; END IF;
 END IF; RETURN new;
END; $$;
DROP TRIGGER IF EXISTS order_delivery_plan_payment ON public.orders;
CREATE TRIGGER order_delivery_plan_payment AFTER UPDATE OF status,payment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_delivery_plan_payment();
CREATE OR REPLACE FUNCTION public.close_unpaid_delivery_cycle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF new.status in ('failed','cancelled') AND old.status='pending' THEN
  UPDATE public.orders SET status='cancelled' WHERE delivery_plan_payment_id=new.id AND status NOT IN ('delivered','cancelled','refunded');
  UPDATE public.membership_cycles SET status='closed',closed_at=now() WHERE payment_id=new.id;
 END IF; RETURN new;
END; $$;
CREATE TRIGGER close_unpaid_delivery_cycle AFTER UPDATE OF status ON public.membership_payments FOR EACH ROW EXECUTE FUNCTION public.close_unpaid_delivery_cycle();
REVOKE ALL ON FUNCTION public.create_order_with_plan(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_plan(jsonb) TO service_role;