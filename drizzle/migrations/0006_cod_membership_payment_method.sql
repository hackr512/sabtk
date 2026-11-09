CREATE OR REPLACE FUNCTION public.order_delivery_plan_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pay public.membership_payments%rowtype;
BEGIN
  IF new.delivery_plan_payment_id IS NULL OR new.status IS NOT DISTINCT FROM old.status THEN RETURN new; END IF;
  SELECT * INTO v_pay FROM public.membership_payments WHERE id=new.delivery_plan_payment_id FOR UPDATE;
  IF new.status='delivered' AND new.payment_status='paid' AND v_pay.status='pending' THEN
    PERFORM public.membership_record_payment(v_pay.id,'cash',new.order_number,auth.uid());
  ELSIF new.status='cancelled' AND v_pay.status='pending' THEN
    UPDATE public.membership_payments SET status='cancelled', note='Cancelled with order ' || new.order_number WHERE id=v_pay.id;
    IF v_pay.kind='new' THEN UPDATE public.memberships SET status='cancelled', cancelled_at=now() WHERE id=v_pay.membership_id AND status='pending_payment'; END IF;
  END IF;
  RETURN new;
END; $$;