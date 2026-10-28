import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { ProductGrid, ProductRail } from "@/components/shop/ProductCard";
import { EmptyState, PageHeader, SectionHeader } from "@/components/site/Blocks";
import { offersQuery } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/offers")({
  head: () => pageHead("Offers & best value", "Current grocery discounts and the best value per kg and litre at SabTk."),
  loader: ({ context }) => context.queryClient.ensureQueryData(offersQuery),
  errorComponent: ({ error }) => <div role="alert" className="container-page py-12">{error instanceof Error ? error.message : "Could not load offers."}</div>,
  notFoundComponent: () => <div className="container-page py-12">No offers found.</div>,
  component: Offers,
});

function Offers() {
  const { data } = useSuspenseQuery(offersQuery);
  const notes = Object.fromEntries(data.bestValue.map((p) => [p.id, p.valueNote]));
  return (
    <>
      <PageHeader eyebrow="Offers" title="Save on your basket" subtitle="Real discounts on everyday items, plus the cheapest per-kg and per-litre picks." />
      <div className="container-page space-y-12 py-8">
        <section>
          <SectionHeader title="On discount now" />
          {data.offers.length ? <ProductGrid products={data.offers} /> : <EmptyState icon={Tag} title="No discounts right now">Check back soon.</EmptyState>}
        </section>
        {data.bestValue.length > 0 && (
          <section>
            <SectionHeader title="Best value per kg / litre" subtitle="Compared within the same category." />
            <ProductRail products={data.bestValue} notes={notes} />
          </section>
        )}
        {data.essentials.length > 0 && (
          <section>
            <SectionHeader title="Weekly essentials" />
            <ProductRail products={data.essentials} />
          </section>
        )}
      </div>
    </>
  );
}
