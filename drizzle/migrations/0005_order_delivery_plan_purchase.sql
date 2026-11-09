ALTER TABLE public.orders ADD COLUMN delivery_plan_id uuid REFERENCES public.membership_plans(id), ADD COLUMN delivery_plan_snapshot jsonb, ADD COLUMN delivery_plan_price numeric NOT NULL DEFAULT 0 CHECK (delivery_plan_price >= 0), ADD COLUMN delivery_plan_selected_at timestamptz, ADD COLUMN delivery_plan_payment_id uuid REFERENCES public.membership_payments(id);
CREATE INDEX orders_delivery_plan_idx ON public.orders(delivery_plan_id) WHERE delivery_plan_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.create_order_with_plan(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_plan public.membership_plans%rowtype; v_result jsonb; v_request jsonb; v_id uuid; v_user uuid := (p->>'user_id')::uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(v_user::text));
  IF nullif(p->>'delivery_plan_id','') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.store_settings WHERE key='membership_enabled' AND value='false') THEN RAISE EXCEPTION 'PLAN_UNAVAILABLE'; END IF;
    SELECT * INTO v_plan FROM public.membership_plans WHERE id=(p->>'delivery_plan_id')::uuid AND is_active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_UNAVAILABLE'; END IF;
    IF (p->>'delivery_plan_expected_price')::numeric IS DISTINCT FROM v_plan.monthly_price THEN RAISE EXCEPTION 'PLAN_PRICE_CHANGED'; END IF;
    v_request := public.membership_request(v_user,v_plan.id);
    p := jsonb_set(p,'total',to_jsonb((p->>'total')::numeric + v_plan.monthly_price));
  END IF;
  v_result := public.create_order(p);
  v_id := (v_result->>'order_id')::uuid;
  IF v_plan.id IS NOT NULL THEN
    UPDATE public.orders SET delivery_plan_id=v_plan.id, delivery_plan_price=v_plan.monthly_price, delivery_plan_selected_at=now(), delivery_plan_payment_id=(v_request->>'payment_id')::uuid,
      delivery_plan_snapshot=jsonb_build_object('id',v_plan.id,'name',v_plan.name,'price',v_plan.monthly_price,'credits',v_plan.included_credits,'validityDays',v_plan.validity_days,'benefits',v_plan.benefits,'description',v_plan.description,'minBasket',v_plan.min_basket,'maxCarryForward',v_plan.max_carry_forward,'zoneIds',v_plan.zone_ids) WHERE id=v_id;
    UPDATE public.membership_payments SET note='Included in COD order ' || (v_result->>'order_number'), provider_reference=v_result->>'order_number' WHERE id=(v_request->>'payment_id')::uuid;
  END IF;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.create_order_with_plan(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_plan(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.order_delivery_plan_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pay public.membership_payments%rowtype;
BEGIN
  IF new.delivery_plan_payment_id IS NULL OR new.status IS NOT DISTINCT FROM old.status THEN RETURN new; END IF;
  SELECT * INTO v_pay FROM public.membership_payments WHERE id=new.delivery_plan_payment_id FOR UPDATE;
  IF new.status='delivered' AND new.payment_status='paid' AND v_pay.status='pending' THEN
    PERFORM public.membership_record_payment(v_pay.id,'cod',new.order_number,auth.uid());
  ELSIF new.status='cancelled' AND v_pay.status='pending' THEN
    UPDATE public.membership_payments SET status='cancelled', note='Cancelled with order ' || new.order_number WHERE id=v_pay.id;
    IF v_pay.kind='new' THEN UPDATE public.memberships SET status='cancelled', cancelled_at=now() WHERE id=v_pay.membership_id AND status='pending_payment'; END IF;
  END IF;
  RETURN new;
END; $$;
CREATE TRIGGER order_delivery_plan_payment AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_delivery_plan_payment();