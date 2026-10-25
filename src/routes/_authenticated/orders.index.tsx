import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/site/Blocks";
import { supabase } from "@/integrations/supabase/client";
import { statusOf } from "@/lib/order-status";
import { formatDeliveryDate, formatPKR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — SabTk" },
      { name: "description", content: "Track and reorder your SabTk grocery orders." },
      { property: "og:title", content: "My orders — SabTk" },
      { property: "og:description", content: "Your SabTk order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, delivery_date, delivery_window, order_items(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader title="My Orders" subtitle="Track deliveries, reorder baskets and get help with an order." />
      <div className="container-page py-8">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        ) : !data?.length ? (
          <EmptyState icon={Package} title="No orders yet" action={<Button asChild><Link to="/shop">Start shopping</Link></Button>}>
            Your orders will appear here after checkout.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {data.map((o) => {
              const s = statusOf(o.status);
              const count = (o.order_items as unknown as { count: number }[])[0]?.count ?? 0;
              return (
                <li key={o.id}>
                  <Link to="/orders/$id" params={{ id: o.id }} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:shadow-card">
                    <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><Package className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{o.order_number}</span>
                        <Badge variant={s.tone}>{s.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {count} item{count === 1 ? "" : "s"} · Delivery {formatDeliveryDate(o.delivery_date)}, {o.delivery_window}
                      </div>
                    </div>
                    <span className="font-bold">{formatPKR(Number(o.total))}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
