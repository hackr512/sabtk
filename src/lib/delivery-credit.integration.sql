-- Run with psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f src/lib/delivery-credit.integration.sql.
-- All fixtures and changes roll back; no live customer data is modified.
BEGIN;
DO $$
DECLARE uid uuid:=gen_random_uuid(); plan public.membership_plans%rowtype; zone public.delivery_zones%rowtype; product public.products%rowtype; payload jsonb; result jsonb; oid uuid; pay uuid; cid uuid; before_orders jsonb; i integer;
BEGIN
 SELECT jsonb_agg(to_jsonb(o)) INTO before_orders FROM public.orders o;
 SELECT * INTO plan FROM public.membership_plans WHERE slug='basic';
 SELECT * INTO zone FROM public.delivery_zones WHERE is_active LIMIT 1;
 SELECT * INTO product FROM public.products WHERE is_active AND stock_quantity>10 LIMIT 1;
 payload:=jsonb_build_object('user_id',uid,'payment_method','cod','customer_name','Credit transaction test','phone','03000000000','zone_id',zone.id,'city',zone.city,'area',zone.area,'address_line','Rollback test only','delivery_date',current_date+1,'delivery_window','Test','subtotal',4200,'discount_total',0,'delivery_fee',150,'total',4350,'eligible_points_subtotal',4200,'points_to_earn',42,'items',jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'pack_size',product.pack_size,'unit_price',4200,'quantity',1,'line_total',4200)));
 result:=public.create_order_with_plan(payload); oid:=(result->>'order_id')::uuid;
 IF (select delivery_fee from public.orders where id=oid)<>150 THEN RAISE EXCEPTION 'No-plan fee must be 150'; END IF;
 UPDATE public.orders SET status='cancelled' WHERE id=oid;
 result:=public.create_order_with_plan(payload||jsonb_build_object('delivery_plan_id',plan.id,'delivery_plan_expected_price',plan.monthly_price)); oid:=(result->>'order_id')::uuid;
 SELECT delivery_plan_payment_id,membership_cycle_id INTO pay,cid FROM public.orders WHERE id=oid;
 IF (select total from public.orders where id=oid)<>4200+plan.monthly_price OR (select delivery_fee from public.orders where id=oid)<>0 THEN RAISE EXCEPTION 'New plan must cover first delivery'; END IF;
 IF (select membership_credit_status from public.orders where id=oid)<>'reserved' OR public.membership_available_credits(cid)<>plan.included_credits-1 THEN RAISE EXCEPTION 'First delivery must reserve exactly one credit'; END IF;
 result:=public.create_order_with_plan(payload);
 IF (select delivery_fee from public.orders where id=(result->>'order_id')::uuid)<>150 THEN RAISE EXCEPTION 'Unpaid credits must remain locked'; END IF;
 UPDATE public.orders SET status='cancelled' WHERE id=(result->>'order_id')::uuid;
 PERFORM public.membership_record_payment(pay,'cash','rollback-test',null);
 PERFORM public.membership_record_payment(pay,'cash','rollback-test',null);
 IF public.membership_available_credits(cid)<>plan.included_credits-1 THEN RAISE EXCEPTION 'Repeated payment must not grant twice'; END IF;
 UPDATE public.orders SET status='delivered',payment_status='paid' WHERE id=oid;
 UPDATE public.orders SET status='delivered',payment_status='paid' WHERE id=oid;
 IF (select count(*) from public.membership_credit_ledger where order_id=oid and kind='consume')<>1 THEN RAISE EXCEPTION 'Repeated delivery must consume once'; END IF;
 result:=public.create_order_with_plan(payload); oid:=(result->>'order_id')::uuid;
 IF (select delivery_fee from public.orders where id=oid)<>0 THEN RAISE EXCEPTION 'Paid credits apply automatically'; END IF;
 UPDATE public.orders SET status='cancelled' WHERE id=oid;
 UPDATE public.orders SET status='cancelled' WHERE id=oid;
 IF public.membership_available_credits(cid)<>plan.included_credits-1 THEN RAISE EXCEPTION 'Cancelled reservation must release once'; END IF;
 FOR i IN 2..plan.included_credits LOOP
  result:=public.create_order_with_plan(payload); oid:=(result->>'order_id')::uuid;
  IF (select delivery_fee from public.orders where id=oid)<>0 THEN RAISE EXCEPTION 'Included deliveries must cost zero'; END IF;
  UPDATE public.orders SET status='delivered',payment_status='paid' WHERE id=oid;
 END LOOP;
 result:=public.create_order_with_plan(payload);
 IF (select delivery_fee from public.orders where id=(result->>'order_id')::uuid)<>150 THEN RAISE EXCEPTION 'Exhausted credits must charge 150'; END IF;
 PERFORM public.membership_adjust_credits(cid,1,'Expiry test',null);
 UPDATE public.memberships SET current_period_end=now()-interval '1 day' WHERE user_id=uid;
 UPDATE public.membership_cycles SET period_end=now()-interval '1 day' WHERE id=cid;
 result:=public.create_order_with_plan(payload);
 IF (select delivery_fee from public.orders where id=(result->>'order_id')::uuid)<>150 THEN RAISE EXCEPTION 'Expired plan must charge 150'; END IF;
 IF EXISTS(select 1 from jsonb_array_elements(before_orders) old join public.orders o on o.id=(old->>'id')::uuid where to_jsonb(o)<>old) THEN RAISE EXCEPTION 'Historical orders must remain unchanged'; END IF;
 RAISE NOTICE 'Delivery credit transaction checks passed: fee, first reservation, payment lock, automatic future credits, exhaustion, expiry, cancellation, idempotency, historical orders';
END; $$;
ROLLBACK;