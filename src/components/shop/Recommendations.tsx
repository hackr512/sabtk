import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useRecentlyViewed } from "@/hooks/use-customer";
import { supabase } from "@/integrations/supabase/client";
import { getProductsByIds } from "@/lib/catalog.functions";
import { SectionHeader } from "@/components/site/Blocks";
import { ProductRail } from "./ProductCard";

/** Products from the signed-in customer's previous orders, most recent first. */
export function ReorderEssentials() {
  const { user } = useAuth();
  const fetchProducts = useServerFn(getProductsByIds);
  const { data } = useQuery({
    queryKey: ["reorder", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("order_items")
        .select("product_id, is_reward, orders!inner(created_at, status)")
        .eq("is_reward", false)
        .not("orders.status", "in", "(cancelled,refunded)")
        .limit(200);
      const ids = Array.from(new Set((rows ?? []).map((r) => r.product_id))).slice(0, 12);
      if (!ids.length) return [];
      return fetchProducts({ data: { ids } });
    },
  });
  if (!user || !data?.length) return null;
  return (
    <section className="container-page mt-14">
      <SectionHeader title="Reorder Your Essentials" subtitle="Items from your previous SabTk orders." />
      <ProductRail products={data} />
    </section>
  );
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { ids } = useRecentlyViewed();
  const fetchProducts = useServerFn(getProductsByIds);
  const list = ids.filter((i) => i !== excludeId).slice(0, 10);
  const { data } = useQuery({
    queryKey: ["recent", list],
    enabled: list.length > 0,
    queryFn: () => fetchProducts({ data: { ids: list } }),
  });
  if (!data?.length) return null;
  const ordered = list.map((id) => data.find((p) => p.id === id)).filter(Boolean) as typeof data;
  return (
    <section className="container-page mt-14">
      <SectionHeader title="Recently Viewed" subtitle="Saved on this device only." />
      <ProductRail products={ordered} />
    </section>
  );
}
