import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminTitle, Empty, report, reportError } from "@/components/admin/AdminBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminListPlans, adminSavePlan } from "@/lib/admin.functions";
import { formatPKR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: Plans,
});

type Data = Awaited<ReturnType<typeof adminListPlans>>;
type Plan = Data["plans"][number];

function Plans() {
  const fn = useServerFn(adminListPlans);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "plans"], queryFn: () => fn() });
  return (
    <>
      <AdminTitle title="Monthly Delivery Plans" subtitle="Changes apply to new and renewed months. Months already paid keep their original terms." />
      {isLoading ? <Empty>Loading…</Empty> : !data?.plans.length ? <Empty>No plans set up.</Empty> : (
        <div className="space-y-4">
          {data.plans.map((p) => <PlanCard key={p.id} plan={p} zones={data.zones} />)}
        </div>
      )}
    </>
  );
}

function PlanCard({ plan, zones }: { plan: Plan; zones: Data["zones"] }) {
  const [v, setV] = useState({
    ...plan,
    price: String(plan.price), credits: String(plan.credits), validityDays: String(plan.validityDays),
    minBasket: String(plan.minBasket), maxCarryForward: String(plan.maxCarryForward), benefitsText: plan.benefits.join("\n"),
  });
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(adminSavePlan);
  const qc = useQueryClient();
  const set = (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }));
  const perDelivery = Number(v.credits) > 0 ? Number(v.price) / Number(v.credits) : 0;

  async function save() {
    setSaving(true);
    try {
      const r = await saveFn({
        data: {
          id: plan.id, name: v.name, description: v.description,
          benefits: v.benefitsText.split("\n").map((b) => b.trim()).filter(Boolean),
          price: Number(v.price), credits: Number(v.credits), validityDays: Number(v.validityDays),
          minBasket: Number(v.minBasket), maxCarryForward: Number(v.maxCarryForward),
          zoneIds: v.zoneIds, isActive: v.isActive, isRecommended: v.isRecommended,
        },
      });
      if (report(r, "Plan saved")) qc.invalidateQueries();
    } catch (e) { reportError(e); } finally { setSaving(false); }
  }

  return (
    <section className="card-surface space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{plan.name}</h2>
        <Badge variant={plan.isActive ? "success" : "muted"}>{plan.isActive ? "On sale" : "Hidden"}</Badge>
        <span className="text-sm text-muted-foreground">{plan.active} active · {plan.pending} waiting for payment</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <F label="Name"><Input value={v.name} onChange={(e) => set("name", e.target.value)} /></F>
        <F label="Monthly price (Rs.)"><Input inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} /></F>
        <F label="Deliveries included"><Input inputMode="numeric" value={v.credits} onChange={(e) => set("credits", e.target.value)} /></F>
        <F label="Valid for (days)"><Input inputMode="numeric" value={v.validityDays} onChange={(e) => set("validityDays", e.target.value)} /></F>
        <F label="Minimum basket to use a credit (Rs.)"><Input inputMode="decimal" value={v.minBasket} onChange={(e) => set("minBasket", e.target.value)} /></F>
        <F label="Max unused credits carried over"><Input inputMode="numeric" value={v.maxCarryForward} onChange={(e) => set("maxCarryForward", e.target.value)} /></F>
      </div>
      <p className="text-sm text-muted-foreground">Works out to {formatPKR(Math.round(perDelivery))} per delivery.</p>
      <F label="Short description"><Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} /></F>
      <F label="Benefits (one per line)"><Textarea rows={3} value={v.benefitsText} onChange={(e) => set("benefitsText", e.target.value)} /></F>
      <div>
        <Label>Available in areas (none selected = all areas)</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {zones.map((z) => {
            const on = v.zoneIds.includes(z.id);
            return (
              <button key={z.id} type="button" onClick={() => set("zoneIds", on ? v.zoneIds.filter((x) => x !== z.id) : [...v.zoneIds, z.id])}
                className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border text-muted-foreground"}`}>
                {z.area}, {z.city}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm"><Switch checked={v.isActive} onCheckedChange={(x) => set("isActive", x)} /> On sale</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={v.isRecommended} onCheckedChange={(x) => set("isRecommended", x)} /> Mark as recommended</label>
        <Button className="ml-auto" disabled={saving} onClick={save}>Save plan</Button>
      </div>
    </section>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
