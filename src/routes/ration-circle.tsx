import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Target, Users } from "lucide-react";
import { CampaignCard } from "@/components/circle/CampaignCard";
import { EmptyState, Notice, PageHeader } from "@/components/site/Blocks";
import { campaignsQuery } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/ration-circle")({
  head: () => pageHead("Ration Circle", "Group-buy bulk groceries with your neighbours. Reach the goal together and everyone pays the group price."),
  loader: ({ context }) => context.queryClient.ensureQueryData(campaignsQuery),
  errorComponent: ({ error }) => <div role="alert" className="container-page py-12">{error instanceof Error ? error.message : "Could not load campaigns."}</div>,
  notFoundComponent: () => <div className="container-page py-12">No campaigns found.</div>,
  component: Circle,
});

function Circle() {
  const { data: campaigns } = useSuspenseQuery(campaignsQuery);
  const open = campaigns.filter((c) => ["collecting", "goal_reached", "confirming_supplier", "confirmed"].includes(c.status));
  const past = campaigns.filter((c) => !open.includes(c));
  return (
    <>
      <PageHeader eyebrow="Ration Circle" title="Buy together, save together" subtitle="Reserve your share of a bulk item. When the group reaches the goal, everyone gets the group price." />
      <div className="container-page space-y-8 py-8">
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Users, t: "1. Reserve", d: "Choose how much you want. No payment now." },
            { icon: Target, t: "2. Reach the goal", d: "Share with neighbours before the deadline." },
            { icon: ShieldCheck, t: "3. Pay on delivery", d: "If the goal isn't met, nobody is charged." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="card-surface flex gap-3 p-4">
              <Icon className="size-5 shrink-0 text-loyalty" />
              <div><div className="font-bold">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
            </li>
          ))}
        </ol>
        {open.length === 0 ? (
          <EmptyState icon={Users} title="No open campaigns right now">Check back soon for the next group buy.</EmptyState>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{open.map((c) => <CampaignCard key={c.id} campaign={c} />)}</div>
        )}
        {past.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold">Past campaigns</h2>
            <div className="grid gap-5 opacity-80 md:grid-cols-2 xl:grid-cols-3">{past.map((c) => <CampaignCard key={c.id} campaign={c} />)}</div>
          </section>
        )}
        <Notice tone="loyalty">Prices marked "estimated" are confirmed with the supplier before delivery. You can withdraw your reservation until the deadline.</Notice>
      </div>
    </>
  );
}
