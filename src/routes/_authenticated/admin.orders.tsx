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
  component: Orders,
});

type OrderStatus = "pending_confirmation" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled" | "refunded";
const STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];

function Orders() {
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [q, setQ] = useState("");
  const listFn = useServerFn(adminListOrders);
  const setFn = useServerFn(adminSetOrderStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "orders", status, q], queryFn: () => listFn({ data: { status, q } }) });

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
      </div>
      {isLoading ? <Empty>Loading…</Empty> : !data?.length ? <Empty>No orders found.</Empty> : (
        <div className="space-y-3">
          {data.map((o) => {
            const s = statusOf(o.status);
            return (
              <div key={o.id} className="card-surface flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/orders/$id" params={{ id: o.id }} className="font-bold hover:underline">{o.order_number}</Link>
                    <Badge variant={s.tone}>{s.label}</Badge>
                    {o.membership_credit_status && o.membership_credit_status !== "none" && (
                      <Badge variant="loyalty">Plan credit: {o.membership_credit_status}</Badge>
                    )}
                  </div>
                  <div>{o.customer_name} · <a href={`tel:${o.phone}`} className="underline">{o.phone}</a></div>
                  <div className="text-muted-foreground">{o.area}, {o.city} · {o.delivery_date ? fmtDate(o.delivery_date) : ""} {o.delivery_window ?? ""}</div>
                  <div className="text-xs text-muted-foreground">Placed {fmtDate(o.created_at)}</div>
                </div>
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
