import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Gift, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice, PageHeader } from "@/components/site/Blocks";
import { useAuth } from "@/hooks/use-auth";
import { usePointsBalance } from "@/hooks/use-customer";
import { supabase } from "@/integrations/supabase/client";
import { applyReferralCode } from "@/lib/loyalty.functions";
import { REFERRAL_MIN_ORDER, REFERRAL_POINTS, RUPEES_PER_POINT, formatPKR } from "@/lib/pricing";
import { storeConfigQuery } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/rewards")({
  head: () => pageHead("Rewards", `Earn 1 point per ${formatPKR(RUPEES_PER_POINT)} and redeem free grocery items. Refer friends for ${REFERRAL_POINTS} bonus points.`),
  component: Rewards,
});

function Rewards() {
  const { user } = useAuth();
  const points = usePointsBalance();
  const { data: config } = useQuery(storeConfigQuery);
  const qc = useQueryClient();
  const apply = useServerFn(applyReferralCode);
  const [code, setCode] = useState("");
  const { data: me } = useQuery({
    queryKey: ["rewards-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [p, l, r] = await Promise.all([
        supabase.from("profiles").select("referral_code").maybeSingle(),
        supabase.from("loyalty_ledger").select("id, points, description, created_at").order("created_at", { ascending: false }).limit(30),
        supabase.from("referrals").select("id, referrer_id, status"),
      ]);
      return { code: p.data?.referral_code ?? "", ledger: l.data ?? [], referrals: r.data ?? [] };
    },
  });
  const balance = points.data ?? 0;
  const invited = me?.referrals.filter((r) => r.referrer_id === user?.id) ?? [];
  const wasReferred = me?.referrals.some((r) => r.referrer_id !== user?.id);

  const submit = async () => {
    try {
      const r = await apply({ data: { code } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Referral code added. Your friend earns points after your first qualifying order.");
      qc.invalidateQueries({ queryKey: ["rewards-me"] });
      setCode("");
    } catch {
      toast.error("That code doesn't look right");
    }
  };

  return (
    <>
      <PageHeader eyebrow="SabTk Rewards" title="Shop, earn, enjoy free items" subtitle={`Earn 1 point for every ${formatPKR(RUPEES_PER_POINT)} spent on eligible items. Points are added after delivery.`} />
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Gift className="size-5 text-loyalty" /> Rewards you can redeem</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {config?.rewards.map((r) => {
                const can = !!user && balance >= r.pointsRequired;
                return (
                  <li key={r.id} className="rounded-xl border border-loyalty/20 bg-loyalty-soft p-4">
                    <div className="font-bold">{r.name}</div>
                    {r.description && <div className="text-sm text-muted-foreground">{r.description}</div>}
                    <div className="mt-2 text-sm font-extrabold text-loyalty">{r.pointsRequired} points</div>
                    <div className="text-xs text-muted-foreground">{can ? "Choose it at checkout." : user ? `${r.pointsRequired - balance} more points needed` : "Sign in to collect points"}</div>
                  </li>
                );
              })}
            </ul>
          </section>
          {user && (
            <section className="card-surface p-5">
              <h2 className="mb-3 text-lg font-bold">Points history</h2>
              {me?.ledger.length ? (
                <ul className="divide-y divide-border text-sm">
                  {me.ledger.map((l) => (
                    <li key={l.id} className="flex justify-between py-2">
                      <span>{l.description}<span className="block text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("en-PK")}</span></span>
                      <span className={l.points > 0 ? "font-bold text-primary" : "font-bold text-destructive"}>{l.points > 0 ? "+" : ""}{l.points}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No points yet. Your first delivered order starts your balance.</p>
              )}
            </section>
          )}
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-loyalty p-5 text-loyalty-foreground">
            <Sparkles className="size-6" />
            <div className="mt-2 text-sm opacity-90">Your balance</div>
            <div className="text-4xl font-extrabold">{user ? balance : "—"} <span className="text-base font-semibold">pts</span></div>
            {!user && <Button asChild variant="secondary" className="mt-4"><Link to="/auth">Sign in to earn</Link></Button>}
          </div>
          <div className="card-surface space-y-3 p-5">
            <h2 className="flex items-center gap-2 font-bold"><Users className="size-5 text-loyalty" /> Refer a friend</h2>
            <p className="text-sm text-muted-foreground">Your friend's first order of {formatPKR(REFERRAL_MIN_ORDER)}+ earns you {REFERRAL_POINTS} points once delivered.</p>
            {user && me?.code ? (
              <>
                <div className="flex items-center justify-between rounded-xl border border-dashed border-loyalty px-3 py-2 font-mono font-bold text-loyalty">
                  {me.code}
                  <button type="button" aria-label="Copy code" onClick={() => { navigator.clipboard.writeText(me.code); toast.success("Code copied"); }}><Copy className="size-4" /></button>
                </div>
                <p className="text-xs text-muted-foreground">{invited.length} friend{invited.length === 1 ? "" : "s"} joined · {invited.filter((r) => r.status === "rewarded").length} rewarded</p>
                {!wasReferred && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="text-sm font-semibold">Got a friend's code?</div>
                    <div className="flex gap-2">
                      <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SBTXXXXXX" aria-label="Friend's referral code" />
                      <Button type="button" variant="secondary" onClick={submit} disabled={code.length < 9}>Add</Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Notice tone="loyalty">Sign in to get your referral code.</Notice>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
