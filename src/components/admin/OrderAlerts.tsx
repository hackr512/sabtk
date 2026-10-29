import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { adminListOrders } from "@/lib/admin.functions";

type Order = Awaited<ReturnType<typeof adminListOrders>>[number];
const SEEN_KEY = "sabtk-admin-orders-seen";

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {
    /* sound blocked */
  }
}

export function OrderAlerts() {
  const list = useServerFn(adminListOrders);
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string>("");
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    setSeen(localStorage.getItem(SEEN_KEY) ?? "");
    let alive = true;
    const load = async () => {
      try {
        const rows = await list({ data: { status: "all" } });
        if (!alive) return;
        if (known.current) {
          const fresh = rows.filter((r) => !known.current!.has(r.id));
          if (fresh.length) {
            beep();
            fresh.forEach((r) =>
              toast.success(`New order ${r.order_number}`, {
                description: `${r.customer_name} · Rs. ${Number(r.total).toLocaleString()}`,
                duration: 15000,
              }),
            );
          }
        }
        known.current = new Set(rows.map((r) => r.id));
        setOrders(rows.slice(0, 30));
      } catch {
        /* retry next tick */
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [list]);

  const unseen = orders.filter((o) => o.created_at > seen).length;

  const toggle = () => {
    setOpen((v) => !v);
    const latest = orders[0]?.created_at;
    if (latest) {
      localStorage.setItem(SEEN_KEY, latest);
      setSeen(latest);
    }
  };

  return (
    <>
      <button
        onClick={toggle}
        aria-label="Order notifications"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg lg:bottom-6"
      >
        <Bell className="size-5" /> Orders
        {unseen > 0 && (
          <span className="grid min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
            {unseen}
          </span>
        )}
      </button>
      {open && (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="font-bold">Live orders</h2>
              <p className="text-xs text-muted-foreground">Checks for new orders every 15 seconds</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"><X className="size-5" /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {orders.length === 0 && <p className="p-4 text-sm text-muted-foreground">No orders yet.</p>}
            {orders.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders"
                onClick={() => setOpen(false)}
                className="block rounded-lg border p-3 text-sm hover:bg-muted"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{o.order_number}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold capitalize text-secondary-foreground">
                    {String(o.status).replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  {o.customer_name} · {o.area} · Rs. {Number(o.total).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        </aside>
      )}
    </>
  );
}
