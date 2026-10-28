import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, PackageOpen, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BundleCard } from "@/components/ration/BundleCard";
import { EmptyState, Notice, PageHeader } from "@/components/site/Blocks";
import { FREE_DELIVERY_THRESHOLD, formatPKR } from "@/lib/pricing";
import { bundlesQuery } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ration")({
  head: () => pageHead("Monthly Ration", "Ready-made monthly ration bundles for every household size, delivered in Islamabad and Rawalpindi."),
  loader: ({ context }) => context.queryClient.ensureQueryData(bundlesQuery),
  errorComponent: ({ error }) => <div role="alert" className="container-page py-12">{error instanceof Error ? error.message : "Could not load bundles."}</div>,
  notFoundComponent: () => <div className="container-page py-12">No bundles found.</div>,
  component: Ration,
});

function Ration() {
  const { data: bundles } = useSuspenseQuery(bundlesQuery);
  return (
    <>
      <PageHeader eyebrow="Monthly Ration" title="Your month's groceries, in one tap" subtitle="Pick a bundle sized for your household, adjust quantities in the cart, and we'll deliver it.">
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild><Link to="/budget">Plan with GharBudget</Link></Button>
          <Button asChild variant="outline"><Link to="/plans">Monthly Delivery Plans</Link></Button>
        </div>
      </PageHeader>
      <div className="container-page space-y-8 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: PackageOpen, t: "Built for families", d: "Staples sized for 2, 4 or 6+ people." },
            { icon: Truck, t: "Free delivery", d: `Most bundles cross ${formatPKR(FREE_DELIVERY_THRESHOLD)}, so delivery is free.` },
            { icon: CalendarClock, t: "Choose your slot", d: "Pick the day and time window at checkout." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card-surface flex gap-3 p-4">
              <Icon className="size-5 shrink-0 text-primary" />
              <div><div className="font-bold">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
            </div>
          ))}
        </div>
        {bundles.length === 0 ? (
          <EmptyState icon={PackageOpen} title="No bundles yet">New ration bundles are coming soon.</EmptyState>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {bundles.map((b, i) => <BundleCard key={b.id} bundle={b} highlight={i === 1} />)}
          </div>
        )}
        <Notice>Bundle prices update with current item prices. Out-of-stock items are skipped when you add a bundle to your cart.</Notice>
      </div>
    </>
  );
}
