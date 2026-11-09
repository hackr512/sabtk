import { readPlanSnapshot } from "@/lib/delivery-plan";
import { pageHead } from "@/lib/seo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminTitle, Empty, fmtDate, report, reportError } from "@/components/admin/AdminBits";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminListOrders, adminSetOrderStatus } from "@/lib/admin.functions";
import { ORDER_STATUS, statusOf } from "@/lib/order-status";
import { formatPKR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => pageHead("Order Management", "Manage SabTk customer orders and delivery statuses.", { noindex: true }),
  component: Orders,
});

type OrderStatus = "pending_confirmation" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled" | "refunded";
const STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];

function Orders() {
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [planFilter, setPlanFilter] = useState<"all" | "with" | "without">("all");
  const [q, setQ] = useState("");
  const listFn = useServerFn(adminListOrders);
  const setFn = useServerFn(adminSetOrderStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "orders", status, q, planFilter], queryFn: () => listFn({ data: { status, q, planFilter } }) });

  async function change(id: string, s: OrderStatus) {
    if ((s === "cancelled" || s === "refunded") && !confirm(`Mark this order as ${statusOf(s).label.toLowerCase()}?`)) return;
    try {
      if (report(await setFn({ data: { id, status: s } }), "Order updated")) qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { reportError(e); }
  }

  return (
    <>
      <AdminTitle title="Orders" subtitle="All orders are cash on delivery. Marking an order delivered records it as paid." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Order no., name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={(x) => setStatus(x as typeof status)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusOf(s).label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(x) => setPlanFilter(x as typeof planFilter)}>
          <SelectTrigger className="w-52" aria-label="Filter delivery plans"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Orders</SelectItem><SelectItem value="with">With Delivery Plan</SelectItem><SelectItem value="without">Without Delivery Plan</SelectItem></SelectContent>
        </Select>
      </div>
      {isLoading ? <Empty>Loading…</Empty> : !data?.length ? <Empty>No orders found.</Empty> : (
        <div className="space-y-3">
          {data.map((o) => {
            const s = statusOf(o.status);
            return (
              <div key={o.id} className="card-surface flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/admin/order/$id" params={{ id: o.id }} className="font-bold hover:underline">{o.order_number}</Link>
                    <Badge variant={s.tone}>{s.label}</Badge>
                    {o.membership_credit_status && o.membership_credit_status !== "none" && (
                      <Badge variant="loyalty">Plan credit: {o.membership_credit_status}</Badge>
                    )}
                  </div>
                  <div>{o.customer_name} · <a href={`tel:${o.phone}`} className="underline">{o.phone}</a></div>
                  <div className="text-muted-foreground">{o.area}, {o.city} · {o.delivery_date ? fmtDate(o.delivery_date) : ""} {o.delivery_window ?? ""}</div>
                  <div className="text-xs text-muted-foreground">Placed {fmtDate(o.created_at)}</div>
                </div>
                <div className="min-w-40 text-sm"><div className="mb-1 text-xs font-semibold text-muted-foreground">Delivery Plan</div><div className={o.delivery_plan_id ? "font-semibold text-primary" : "text-muted-foreground"}>{readPlanSnapshot(o.delivery_plan_snapshot)?.name ?? "No Plan Selected"}</div>{o.delivery_plan_id && <div>{formatPKR(Number(o.delivery_plan_price))}</div>}</div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatPKR(Number(o.total))}</div>
                    <div className="text-xs text-muted-foreground">
                      Delivery {o.delivery_fee_waived ? "covered by plan" : formatPKR(Number(o.delivery_fee))} · {o.payment_status}
                    </div>
                  </div>
                  <Select value={o.status} onValueChange={(x) => change(o.id, x as OrderStatus)}>
                    <SelectTrigger className="h-9 w-52" aria-label="Change status"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((st) => <SelectItem key={st} value={st}>{statusOf(st).label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
