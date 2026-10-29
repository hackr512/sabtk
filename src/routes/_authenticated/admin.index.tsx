import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CreditCard, Crown, Package, PackagePlus, ShoppingCart } from "lucide-react";
import { AdminTitle, fmtDate } from "@/components/admin/AdminBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminDashboard } from "@/lib/admin.functions";
import { statusOf } from "@/lib/order-status";
import { formatPKR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(adminDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => fn() });

  const stats = [
    { label: "Live products", value: data?.active, icon: Package, to: "/admin/products" },
    { label: "Draft products", value: data?.drafts, icon: Package, to: "/admin/products" },
    { label: "Low stock (5 or less)", value: data?.lowStock, icon: AlertTriangle, to: "/admin/products" },
    { label: "Orders to confirm", value: data?.pending, icon: ShoppingCart, to: "/admin/orders" },
    { label: "Active plan members", value: data?.subs, icon: Crown, to: "/admin/subscriptions" },
    { label: "Plan payments to confirm", value: data?.pendingPays, icon: CreditCard, to: "/admin/subscriptions" },
  ] as const;

  return (
    <>
      <AdminTitle
        title="Dashboard"
        subtitle={`${data?.orders ?? 0} orders so far · ${data?.products ?? 0} products`}
        action={
          <Button asChild>
            <Link to="/admin/products/new"><PackagePlus className="size-4" /> Add product</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card-surface p-4 transition hover:shadow-md">
            <s.icon className="mb-2 size-5 text-primary" />
            <div className="text-2xl font-bold">{isLoading ? "…" : s.value ?? 0}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>
      <section className="card-surface mt-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Latest orders</h2>
          <Link to="/admin/orders" className="text-sm font-semibold text-primary">See all</Link>
        </div>
        {!data?.recent.length ? (
          <p className="text-sm text-muted-foreground">{isLoading ? "Loading…" : "No orders yet."}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {data.recent.map((o) => {
              const s = statusOf(o.status);
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><b>{o.order_number}</b> · {o.customer_name} · {fmtDate(o.created_at)}</span>
                  <span className="flex items-center gap-2">{formatPKR(Number(o.total))} <Badge variant={s.tone}>{s.label}</Badge></span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
