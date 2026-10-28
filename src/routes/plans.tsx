import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Crown, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice, PageHeader } from "@/components/site/Blocks";
import { useAuth } from "@/hooks/use-auth";
import { getMyMembership, getPlans, requestPlan } from "@/lib/membership.functions";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, costPerDelivery, formatPKR } from "@/lib/pricing";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

const plansQuery = queryOptions({ queryKey: ["plans"], queryFn: () => getPlans(), staleTime: 60_000 });

export const Route = createFileRoute("/plans")({
  head: () => pageHead("Monthly Delivery Plans", `Pay once a month and get delivery credits that cover the ${formatPKR(DELIVERY_FEE)} fee on smaller orders.`),
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  errorComponent: ({ error }) => <div role="alert" className="container-page py-12">{error instanceof Error ? error.message : "Could not load plans."}</div>,
  notFoundComponent: () => <div className="container-page py-12">No plans found.</div>,
  component: Plans,
});

function Plans() {
  const { data } = useSuspenseQuery(plansQuery);
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const request = useServerFn(requestPlan);
  const mineFn = useServerFn(getMyMembership);
  const { data: mine } = useQuery({ queryKey: ["my-membership", user?.id], enabled: !!user, queryFn: () => mineFn() });
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<{ amount: number; kind: string } | null>(null);

  const choose = async (planId: string) => {
    if (!user) return navigate({ to: "/auth", search: { redirect: "/plans" } });
    setBusy(planId);
    try {
      const r = await request({ data: { planId } });
      if (!r.ok) return toast.error(r.error);
      setDone({ amount: r.amount, kind: r.kind });
      qc.invalidateQueries({ queryKey: ["my-membership"] });
    } catch {
      toast.error("We couldn't save your request. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const current = mine?.current;
  const pending = mine?.pendingPayment;

  return (
    <>
      <PageHeader eyebrow={<span className="text-loyalty">Monthly Delivery Plans</span>} title="Small orders, no delivery fee" subtitle={`Orders under ${formatPKR(FREE_DELIVERY_THRESHOLD)} normally cost ${formatPKR(DELIVERY_FEE)} to deliver. A plan gives you monthly credits — one credit covers the fee on one order.`} />
      <div className="container-page space-y-8 py-8">
        {!data.enabled && <Notice tone="warning">New subscriptions are paused right now.</Notice>}
        {(done || pending) && (
          <Notice tone="loyalty">
            <b>Request received — not active yet.</b> Amount due: {formatPKR(done?.amount ?? pending!.amount)}. {data.paymentInstructions}{" "}
            <Link to="/account" className="font-semibold text-loyalty underline">See it in My Account</Link>
          </Notice>
        )}
        {current?.status === "active" && (
          <Notice tone="loyalty">
            You're on <b>{current.planName}</b> with {current.credits.available} of {current.credits.granted} credits left until {current.periodEnd ? new Date(current.periodEnd).toLocaleDateString("en-PK") : "the end of this period"}.
          </Notice>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          {data.plans.map((p) => {
            const isMine = current?.planId === p.id && current.status === "active";
            return (
              <article key={p.id} className={cn("relative flex flex-col rounded-2xl border bg-card p-6 shadow-card", p.isRecommended ? "border-loyalty ring-2 ring-loyalty/20" : "border-border")}>
                {p.isRecommended && <Badge variant="loyalty" className="absolute -top-3 left-6"><Crown className="mr-1 size-3" /> Most popular</Badge>}
                <h2 className="text-xl font-bold">{p.name}</h2>
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                <div className="mt-4 text-4xl font-extrabold">{formatPKR(p.price)}<span className="text-base font-semibold text-muted-foreground"> /month</span></div>
                <div className="mt-1 text-sm font-semibold text-loyalty">{p.credits} deliveries included · {formatPKR(costPerDelivery(p.price, p.credits))} each</div>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {[
                    `${p.credits} delivery credits every ${p.validityDays} days`,
                    p.minBasket > 0 ? `Minimum basket ${formatPKR(p.minBasket)} to use a credit` : "No minimum basket",
                    p.maxCarryForward > 0 ? `Carry up to ${p.maxCarryForward} unused credits forward` : "Credits reset each period",
                    ...p.benefits,
                  ].map((b) => (
                    <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {b}</li>
                  ))}
                </ul>
                <Button className={cn("mt-6 w-full", p.isRecommended && "bg-loyalty text-loyalty-foreground hover:bg-loyalty/90")} disabled={!data.enabled || busy !== null || !!pending || isMine} onClick={() => choose(p.id)}>
                  {isMine ? "Your current plan" : busy === p.id ? "Saving…" : current?.status === "active" ? "Renew / switch next month" : "Choose plan"}
                </Button>
              </article>
            );
          })}
        </div>
        <section className="card-surface grid gap-4 p-5 md:grid-cols-2">
          <div className="flex gap-3"><Truck className="size-5 shrink-0 text-primary" /><p className="text-sm">Orders of {formatPKR(FREE_DELIVERY_THRESHOLD)}+ already ship free, so no credit is used on them.</p></div>
          <p className="text-sm text-muted-foreground">Credits are used only when your order is delivered. Cancelled orders give the credit back. Your plan starts only after we confirm your payment — nothing is charged online.</p>
        </section>
      </div>
    </>
  );
}
