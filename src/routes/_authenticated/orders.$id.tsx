import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";
import { getProductsByIds } from "@/lib/catalog.functions";
import { ORDER_FLOW, statusOf } from "@/lib/order-status";
import { cancelOrder } from "@/lib/orders.functions";
import { formatDeliveryDate, formatPKR } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — SabTk" },
      { name: "description", content: "Track your SabTk order status and delivery." },
      { property: "og:title", content: "Order details — SabTk" },
      { property: "og:description", content: "Order status and items." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const cart = useCart();
  const cancel = useServerFn(cancelOrder);
  const fetchProducts = useServerFn(getProductsByIds);
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState("question");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), order_status_events(status, created_at, note)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="container-page py-10"><div className="h-60 animate-pulse rounded-2xl bg-muted" /></div>;
  if (!order) return <div className="container-page py-16 text-center"><h1 className="text-2xl font-bold">Order not found</h1><Link to="/orders" className="mt-3 inline-block text-primary">Back to orders</Link></div>;

  const s = statusOf(order.status);
  const step = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);
  const events = [...(order.order_status_events ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const reorder = async () => {
    const ids = order.order_items.filter((i) => !i.is_reward).map((i) => i.product_id);
    const fresh = await fetchProducts({ data: { ids } });
    cart.addMany(order.order_items.filter((i) => !i.is_reward).flatMap((i) => {
      const p = fresh.find((x) => x.id === i.product_id);
      return p ? [{ product: p, quantity: i.quantity }] : [];
    }));
    toast.success("Items added to cart at today's prices");
  };

  const doCancel = async () => {
    const r = await cancel({ data: { orderId: order.id } });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Order cancelled");
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const sendSupport = async () => {
    if (!user || msg.trim().length < 5) return;
    const { error } = await supabase.from("support_requests").insert({ user_id: user.id, order_id: order.id, kind, message: msg.trim() });
    if (error) toast.error("Could not send your request");
    else {
      toast.success("Request sent. Our team will get back to you.");
      setMsg("");
    }
  };

  return (
    <div className="container-page py-6 md:py-10">
      <Link to="/orders" className="text-sm font-semibold text-primary">← All orders</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">{order.order_number}</h1>
        <Badge variant={s.tone}>{s.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Delivery {formatDeliveryDate(order.delivery_date)}, {order.delivery_window} · {order.area}, {order.city}
      </p>

      {step >= 0 && (
        <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Order progress">
          {ORDER_FLOW.map((st, i) => (
            <li key={st} className="text-center">
              <div className={cn("mx-auto grid size-8 place-items-center rounded-full text-xs font-bold", i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {i < step ? <Check className="size-4" /> : i + 1}
              </div>
              <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{statusOf(st).label}</div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {order.order_items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3">
                {i.image && <img src={i.image} alt="" width={56} height={56} className="size-14 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.quantity} × {i.unit_price ? formatPKR(Number(i.unit_price)) : "Free"} · {i.pack_size}</div>
                </div>
                <div className="font-semibold">{Number(i.line_total) ? formatPKR(Number(i.line_total)) : "Free"}</div>
              </li>
            ))}
          </ul>

          <div className="card-surface p-5">
            <h2 className="font-bold">Need help with this order?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[["question", "Question"], ["missing_item", "Missing item"], ["return", "Return"], ["refund", "Refund"], ["cancellation", "Cancellation"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setKind(k!)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", kind === k ? "border-primary bg-primary-soft text-primary" : "border-border")}>{l}</button>
              ))}
            </div>
            <Textarea className="mt-3" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tell us what happened" aria-label="Support message" />
            <Button className="mt-3" variant="secondary" onClick={sendSupport} disabled={msg.trim().length < 5}>Send request</Button>
          </div>
        </div>

        <aside className="h-fit space-y-4">
          <div className="card-surface space-y-2 p-5 text-sm">
            <div className="flex justify-between"><span>Item subtotal</span><span>{formatPKR(Number(order.subtotal))}</span></div>
            {Number(order.discount_total) > 0 && <div className="flex justify-between text-primary"><span>Promo discount</span><span>-{formatPKR(Number(order.discount_total))}</span></div>}
            {order.points_redeemed > 0 && <div className="flex justify-between text-loyalty"><span>Points redeemed</span><span>{order.points_redeemed} pts</span></div>}
            <div className="flex justify-between"><span>Delivery fee</span><span>{Number(order.delivery_fee) ? formatPKR(Number(order.delivery_fee)) : "Free"}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><span>Total (Cash on Delivery)</span><span>{formatPKR(Number(order.total))}</span></div>
            {order.points_to_earn > 0 && (
              <p className="pt-1 text-xs font-semibold text-loyalty">
                {order.status === "delivered" ? `${order.points_to_earn} points earned` : `${order.points_to_earn} points will be added after delivery`}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Button variant="outline" onClick={reorder}><RotateCcw /> Reorder this basket</Button>
            {order.status === "pending_confirmation" && <Button variant="ghost" onClick={doCancel}>Cancel order</Button>}
          </div>
          {events.length > 0 && (
            <div className="card-surface p-5 text-sm">
              <h2 className="mb-2 font-bold">History</h2>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {events.map((e, i) => (
                  <li key={i}>{new Date(e.created_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} — {statusOf(e.status).label}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
