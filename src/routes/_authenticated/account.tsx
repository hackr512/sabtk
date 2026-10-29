import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Crown, LogOut, Package, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/site/Blocks";
import { useAuth } from "@/hooks/use-auth";
import { usePointsBalance } from "@/hooks/use-customer";
import { supabase } from "@/integrations/supabase/client";
import { getMyMembership } from "@/lib/membership.functions";
import { formatPKR } from "@/lib/pricing";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => pageHead("My account", "Your SabTk profile, delivery plan, credits and rewards.", { noindex: true }),
  component: Account,
});

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-PK") : "—");

function Account() {
  const { user, signOut } = useAuth();
  const points = usePointsBalance();
  const membershipFn = useServerFn(getMyMembership);
  const { data: m } = useQuery({ queryKey: ["my-membership", user?.id], enabled: !!user, queryFn: () => membershipFn() });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("full_name, phone").maybeSingle()).data,
  });
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" })).data === true,
  });
  const cur = m?.current;

  return (
    <>
      <PageHeader title="My Account" subtitle={profile?.full_name || user?.email || ""} />
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_320px]">
        <section className="card-surface space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Crown className="size-5 text-loyalty" /> Monthly Delivery Plan</h2>
          {cur ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{cur.planName}</span>
                <Badge variant={cur.status === "active" ? "loyalty" : "warning"}>{cur.status === "pending_payment" ? "Waiting for payment" : cur.status}</Badge>
              </div>
              {cur.status === "active" && (
                <>
                  <div className="text-sm">{cur.credits.available} of {cur.credits.granted} credits left · {cur.credits.used} used · {cur.credits.held} held by open orders</div>
                  <Progress value={cur.credits.granted ? (cur.credits.available / cur.credits.granted) * 100 : 0} />
                  <div className="text-xs text-muted-foreground">Period {d(cur.periodStart)} – {d(cur.periodEnd)}{cur.renewalScheduled ? " · next month paid" : ""}</div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No plan yet. <Link to="/plans" className="font-semibold text-loyalty underline">See plans</Link></p>
          )}
          {m?.pendingPayment && <p className="text-sm">Payment due: <b>{formatPKR(m.pendingPayment.amount)}</b> for {m.pendingPayment.planName} — waiting for confirmation.</p>}
          {!!m?.payments.length && (
            <div>
              <h3 className="mb-2 text-sm font-bold">History</h3>
              <ul className="divide-y divide-border text-sm">
                {m.payments.map((p) => (
                  <li key={p.id} className="flex justify-between py-2"><span>{p.planName} · {d(p.createdAt)}</span><span>{formatPKR(p.amount)} · {p.status}</span></li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <aside className="space-y-3">
          {isAdmin && <Link to="/admin" className="card-surface flex items-center gap-3 border-primary p-4 font-semibold"><ShieldCheck className="size-5 text-primary" /> Admin panel</Link>}
          <Link to="/orders" className="card-surface flex items-center gap-3 p-4 font-semibold"><Package className="size-5 text-primary" /> My orders</Link>
          <Link to="/rewards" className="card-surface flex items-center gap-3 p-4 font-semibold"><Sparkles className="size-5 text-loyalty" /> Rewards · {points.data ?? 0} pts</Link>
          <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="size-4" /> Sign out</Button>
        </aside>
      </div>
    </>
  );
}
