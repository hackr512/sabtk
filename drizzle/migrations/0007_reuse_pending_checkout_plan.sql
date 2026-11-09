CREATE OR REPLACE FUNCTION public.checkout_plan_request(p_user uuid,p_plan uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pay public.membership_payments%rowtype; v_price numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user::text));
  SELECT * INTO v_pay FROM public.membership_payments WHERE user_id=p_user AND status='pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF v_pay.plan_id<>p_plan OR EXISTS(SELECT 1 FROM public.orders WHERE delivery_plan_payment_id=v_pay.id AND status NOT IN ('cancelled','refunded')) THEN RAISE EXCEPTION 'ALREADY_PENDING'; END IF;
    SELECT monthly_price INTO v_price FROM public.membership_plans WHERE id=p_plan AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_UNAVAILABLE'; END IF;
    UPDATE public.membership_payments SET amount=v_price WHERE id=v_pay.id;
    RETURN jsonb_build_object('payment_id',v_pay.id,'membership_id',v_pay.membership_id,'kind',v_pay.kind,'amount',v_price);
  END IF;
  RETURN public.membership_request(p_user,p_plan);
END; $$;
REVOKE ALL ON FUNCTION public.checkout_plan_request(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_plan_request(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.create_order_with_plan(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_plan public.membership_plans%rowtype; v_result jsonb; v_request jsonb; v_id uuid; v_user uuid := (p->>'user_id')::uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(v_user::text));
  IF nullif(p->>'delivery_plan_id','') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.store_settings WHERE key='membership_enabled' AND value='false') THEN RAISE EXCEPTION 'PLAN_UNAVAILABLE'; END IF;
    SELECT * INTO v_plan FROM public.membership_plans WHERE id=(p->>'delivery_plan_id')::uuid AND is_active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_UNAVAILABLE'; END IF;
    IF (p->>'delivery_plan_expected_price')::numeric IS DISTINCT FROM v_plan.monthly_price THEN RAISE EXCEPTION 'PLAN_PRICE_CHANGED'; END IF;
    v_request := public.checkout_plan_request(v_user,v_plan.id);
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