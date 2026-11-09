import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { OrderDeliveryPlan } from '@/components/plans/OrderDeliveryPlan';
import { AdminTitle } from '@/components/admin/AdminBits';
import { adminGetOrder } from '@/lib/admin.functions';
import { formatPKR } from '@/lib/pricing';
import { statusOf } from '@/lib/order-status';
import { pageHead } from '@/lib/seo';
export const Route = createFileRoute('/_authenticated/admin/orders/$id')({
  head: () => pageHead('Admin Order Details', 'Review SabTk order items, payment and selected delivery plan.', { noindex: true }),
  component: AdminOrder,
});
function AdminOrder() {
  const { id } = Route.useParams();
  const getOrder = useServerFn(adminGetOrder);
  const { data: o, isPending, error } = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => getOrder({ data: { id } }) });
  if (isPending) return <p>Loading order…</p>;
  if (error || !o) return <p role="alert">Could not load this order.</p>;
  return <div className="space-y-6"><Link to="/admin/orders" className="text-sm font-semibold text-primary">← All orders</Link><AdminTitle title={o.order_number} subtitle={`${o.customer_name} · ${o.phone} · ${statusOf(o.status).label}`} />
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><div className="space-y-5"><p className="text-sm">{o.address_line}, {o.area}, {o.city}<br />{o.delivery_date} · {o.delivery_window}</p>
    <ul className="divide-y divide-border">{o.order_items.map(i => <li key={i.id} className="flex justify-between gap-3 py-3 text-sm"><span>{i.quantity} × {i.name} · {i.pack_size}</span><span>{formatPKR(Number(i.line_total))}</span></li>)}</ul>
    <OrderDeliveryPlan snapshot={o.delivery_plan_snapshot} selectedAt={o.delivery_plan_selected_at} /></div>
    <aside className="space-y-3 text-sm"><h2 className="font-bold">Order summary</h2><dl className="space-y-2"><div className="flex justify-between"><dt>Grocery subtotal</dt><dd>{formatPKR(Number(o.subtotal))}</dd></div>{o.delivery_plan_id && <div className="flex justify-between"><dt>Delivery plan</dt><dd>{formatPKR(Number(o.delivery_plan_price))}</dd></div>}<div className="flex justify-between"><dt>Discount</dt><dd>{formatPKR(Number(o.discount_total))}</dd></div><div className="flex justify-between"><dt>Delivery service fee</dt><dd>{formatPKR(Number(o.delivery_fee))}</dd></div><div className="flex justify-between border-t border-border pt-3 font-bold"><dt>Final payable</dt><dd>{formatPKR(Number(o.total))}</dd></div></dl><p>Cash on delivery · {o.payment_status}</p></aside></div></div>;
}
