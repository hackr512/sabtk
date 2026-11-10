ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready_for_dispatch';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'failed_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_requested';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'returned';