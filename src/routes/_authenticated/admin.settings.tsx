import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminTitle, Empty, report, reportError } from "@/components/admin/AdminBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminGetSettings, adminSaveSettings, SETTINGS_KEYS } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: Settings,
});

type Key = (typeof SETTINGS_KEYS)[number];
const TEXT: { k: Key; l: string; ph?: string }[] = [
  { k: "support_phone", l: "Support phone", ph: "03xx xxxxxxx" },
  { k: "whatsapp_number", l: "WhatsApp number", ph: "923xxxxxxxxx" },
  { k: "support_email", l: "Support email" },
  { k: "facebook_url", l: "Facebook link" },
  { k: "instagram_url", l: "Instagram link" },
  { k: "tiktok_url", l: "TikTok link" },
];
const TOGGLES: { k: Key; l: string; d: string }[] = [
  { k: "membership_enabled", l: "Sell Monthly Delivery Plans", d: "Turn off to hide plans from customers." },
  { k: "membership_restore_credit_on_refund", l: "Give the credit back when a plan order is refunded", d: "Cancelled orders always get their credit back." },
  { k: "catalog_is_sample", l: "Show 'placeholder prices' notice", d: "Turn off once your real products and prices are in." },
];

function Settings() {
  const getFn = useServerFn(adminGetSettings);
  const saveFn = useServerFn(adminSaveSettings);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => getFn() });
  const [v, setV] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setV(data); }, [data]);

  async function save() {
    setSaving(true);
    const values = Object.fromEntries(SETTINGS_KEYS.map((k) => [k, v[k] ?? ""])) as Record<Key, string>;
    try { if (report(await saveFn({ data: { values } }), "Settings saved")) qc.invalidateQueries(); }
    catch (e) { reportError(e); } finally { setSaving(false); }
  }

  if (isLoading) return <Empty>Loading…</Empty>;
  return (
    <>
      <AdminTitle title="Settings" subtitle="Contact details appear on the Contact page and footer." action={<Button disabled={saving} onClick={save}>Save settings</Button>} />
      <div className="space-y-5">
        <section className="card-surface grid gap-4 p-5 sm:grid-cols-2">
          {TEXT.map((t) => (
            <div key={t.k} className="space-y-1.5">
              <Label htmlFor={t.k}>{t.l}</Label>
              <Input id={t.k} placeholder={t.ph} value={v[t.k] ?? ""} onChange={(e) => setV((s) => ({ ...s, [t.k]: e.target.value }))} />
            </div>
          ))}
        </section>
        <section className="card-surface space-y-4 p-5">
          {TOGGLES.map((t) => (
            <label key={t.k} className="flex items-center justify-between gap-4">
              <span><span className="block text-sm font-semibold">{t.l}</span><span className="text-xs text-muted-foreground">{t.d}</span></span>
              <Switch checked={(v[t.k] ?? (t.k === "membership_enabled" ? "true" : "false")) === "true"} onCheckedChange={(x) => setV((s) => ({ ...s, [t.k]: String(x) }))} />
            </label>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="pay">How customers should pay for a plan</Label>
            <Textarea id="pay" rows={3} placeholder="e.g. Pay the rider in cash with your next order, or send to our JazzCash account…" value={v["membership_payment_instructions"] ?? ""}
              onChange={(e) => setV((s) => ({ ...s, membership_payment_instructions: e.target.value }))} />
          </div>
        </section>
      </div>
    </>
  );
}
