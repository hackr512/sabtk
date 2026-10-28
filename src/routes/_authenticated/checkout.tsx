import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Notice } from "@/components/site/Blocks";
import { useArea } from "@/hooks/use-area";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { usePointsBalance } from "@/hooks/use-customer";
import { supabase } from "@/integrations/supabase/client";
import { getMyMembership } from "@/lib/membership.functions";
import { checkPromo, placeOrder, type PlaceOrderInput } from "@/lib/orders.functions";
import {
  applyMembershipCredit,
  computeTotals,
  deliveryDateOptions,
  formatDeliveryDate,
  formatPKR,
  membershipDecision,
  type PromoRule,
} from "@/lib/pricing";
import { storeConfigQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — SabTk" },
      { name: "description", content: "Confirm your delivery details and place your SabTk order." },
      { property: "og:title", content: "Checkout — SabTk" },
      { property: "og:description", content: "Secure checkout with cash on delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const cart = useCart();
  const { user } = useAuth();
  const { zoneId } = useArea();
  const navigate = useNavigate();
  const { data: config } = useQuery(storeConfigQuery);
  const points = usePointsBalance();
  const place = useServerFn(placeOrder);
  const promoFn = useServerFn(checkPromo);
  const dates = useMemo(() => deliveryDateOptions(), []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("full_name, phone").maybeSingle()).data,
  });
  const { data: addresses } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false })).data ?? [],
  });

  const [f, setF] = useState({
    name: "",
    phone: "",
    zoneId: "",
    address: "",
    instructions: "",
    date: dates[0] ?? "",
    windowId: "",
    notes: "",
    saveAddress: true,
  });
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; rule: PromoRule } | null>(null);
  const [rewardId, setRewardId] = useState<string | null>(null);
  const [useCredit, setUseCredit] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const membershipFn = useServerFn(getMyMembership);
  const { data: membership } = useQuery({ queryKey: ["my-membership", user?.id], enabled: !!user, queryFn: () => membershipFn() });

  useEffect(() => {
    const a = addresses?.[0];
    setF((prev) => ({
      ...prev,
      name: prev.name || a?.full_name || profile?.full_name || "",
      phone: prev.phone || a?.phone || profile?.phone || "",
      zoneId: prev.zoneId || a?.zone_id || zoneId || "",
      address: prev.address || a?.address_line || "",
      instructions: prev.instructions || a?.instructions || "",
      saveAddress: addresses ? addresses.length === 0 : prev.saveAddress,
    }));
  }, [profile, addresses, zoneId]);

  useEffect(() => {
    if (!f.windowId && config?.windows[0]) setF((p) => ({ ...p, windowId: config.windows[0]!.id }));
  }, [config, f.windowId]);

  const lines = cart.items.filter((i) => i.quantity > 0);
  const baseTotals = computeTotals(
    lines.map((i) => ({ unitPrice: i.price, quantity: i.quantity, pointsEligible: i.pointsEligible })),
    promo?.rule ?? null,
  );
  const plan = membership?.current?.status === "active" ? membership.current : null;
  const decision = membershipDecision(
    baseTotals,
    plan ? { creditsAvailable: plan.credits.available, minBasket: plan.minBasket, zoneIds: plan.zoneIds } : null,
    f.zoneId || null,
  );
  const creditOn = useCredit && decision.applies;
  const totals = applyMembershipCredit(baseTotals, { ...decision, applies: creditOn });
  const balance = points.data ?? 0;

  if (cart.ready && lines.length === 0) {
    return (
      <div className="container-page py-12">
        <EmptyState icon={ShieldCheck} title="Nothing to check out" action={<Button asChild><Link to="/shop">Go shopping</Link></Button>}>
          Your cart is empty.
        </EmptyState>
      </div>
    );
  }

  const applyPromo = async () => {
    const r = await promoFn({ data: { code: promoInput, subtotal: totals.subtotal } });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setPromo({ code: r.code, rule: r.rule });
    toast.success("Promo code applied");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: PlaceOrderInput = {
        items: lines.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customerName: f.name,
        phone: f.phone.replace(/\s/g, ""),
        zoneId: f.zoneId,
        addressLine: f.address,
        deliveryDate: f.date,
        windowId: f.windowId,
        paymentMethod: "cod",
        saveAddress: f.saveAddress,
      };
      if (f.instructions) payload.instructions = f.instructions;
      if (f.notes) payload.notes = f.notes;
      if (promo) payload.promoCode = promo.code;
      if (rewardId) payload.rewardId = rewardId;
      if (creditOn) payload.useMembershipCredit = true;
      const r = await place({ data: payload });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      cart.clear();
      toast.success(`Order ${r.orderNumber} placed`);
      navigate({ to: "/orders/$id", params: { id: r.orderId } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("[") ? "Please check the highlighted details and try again." : msg || "Could not place the order.");
    } finally {
      setBusy(false);
    }
  };

  const cities = ["Islamabad", "Rawalpindi"];

  return (
    <form onSubmit={submit} className="container-page grid gap-8 py-6 md:py-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold md:text-4xl">Checkout</h1>

        <fieldset className="card-surface space-y-4 p-5">
          <legend className="sr-only">Contact</legend>
          <h2 className="text-lg font-bold">1. Your details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" required inputMode="tel" placeholder="03001234567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="mt-1" />
            </div>
          </div>
        </fieldset>

        <fieldset className="card-surface space-y-4 p-5">
          <h2 className="text-lg font-bold">2. Delivery address</h2>
          <div>
            <Label htmlFor="zone">Area</Label>
            <select
              id="zone"
              required
              value={f.zoneId}
              onChange={(e) => setF({ ...f, zoneId: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary"
            >
              <option value="">Select your area</option>
              {cities.map((c) => (
                <optgroup key={c} label={c}>
                  {config?.zones.filter((z) => z.city === c).map((z) => (
                    <option key={z.id} value={z.id}>{z.area}, {c}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Not listed? We don't deliver there yet.</p>
          </div>
          <div>
            <Label htmlFor="address">House / street / block</Label>
            <Textarea id="address" required rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="instructions">Directions for the rider (optional)</Label>
            <Input id="instructions" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} className="mt-1" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.saveAddress} onChange={(e) => setF({ ...f, saveAddress: e.target.checked })} />
            Save this address to my account
          </label>
        </fieldset>

        <fieldset className="card-surface space-y-4 p-5">
          <h2 className="text-lg font-bold">3. Delivery window</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Delivery date">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={f.date === d}
                onClick={() => setF({ ...f, date: d })}
                className={cn("rounded-xl border px-4 py-2 text-sm font-semibold", f.date === d ? "border-primary bg-primary-soft text-primary" : "border-border")}
              >
                {formatDeliveryDate(d)}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Delivery time">
            {config?.windows.map((w) => (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={f.windowId === w.id}
                onClick={() => setF({ ...f, windowId: w.id })}
                className={cn("rounded-xl border px-4 py-2.5 text-left text-sm font-semibold", f.windowId === w.id ? "border-primary bg-primary-soft text-primary" : "border-border")}
              >
                {w.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="card-surface space-y-3 p-5">
          <h2 className="text-lg font-bold">4. Payment</h2>
          <div className="rounded-xl border border-primary bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">Cash on Delivery</div>
          <p className="text-xs text-muted-foreground">Online payment options are not available yet.</p>
          <div>
            <Label htmlFor="notes">Order notes (optional)</Label>
            <Input id="notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="mt-1" placeholder="e.g. call before arriving" />
          </div>
        </fieldset>

        <Notice>
          <b>Substitutions:</b> we never substitute without asking. If an item is unavailable when we pack your order, we'll call you or remove it and adjust your total.{" "}
          <Link to="/policies" className="font-semibold text-primary underline">Cancellation & refund policy</Link>
        </Notice>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-40">
        <div className="card-surface space-y-4 p-5">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
            {lines.map((i) => (
              <li key={i.productId} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{i.quantity} × {i.name} <span className="text-muted-foreground">{i.packSize}</span></span>
                <span className="shrink-0">{formatPKR(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Input placeholder="Promo code" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} aria-label="Promo code" />
            <Button type="button" variant="secondary" onClick={applyPromo} disabled={promoInput.trim().length < 2}>Apply</Button>
          </div>
          {promo && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary">{promo.code} applied</span>
              <button type="button" className="text-muted-foreground underline" onClick={() => setPromo(null)}>Remove</button>
            </div>
          )}

          {plan && (
            <div className={cn("rounded-xl border p-3 text-sm", creditOn ? "border-loyalty bg-loyalty-soft" : "border-border")}>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" disabled={!decision.applies} checked={creditOn} onChange={(e) => setUseCredit(e.target.checked)} />
                <span>
                  <span className="block font-semibold text-loyalty">Use 1 delivery credit ({plan.planName})</span>
                  <span className="text-xs text-muted-foreground">
                    {plan.credits.available} of {plan.credits.granted} credits left this period.
                    {decision.reason ? ` ${decision.reason}` : " Your credit is used only when this order is delivered."}
                  </span>
                </span>
              </label>
            </div>
          )}
          {!plan && membership?.current?.status === "pending_payment" && (
            <p className="text-xs text-muted-foreground">Your delivery plan starts once we confirm your payment.</p>
          )}

          {config?.rewards.map((r) => {
            const can = balance >= r.pointsRequired;
            return (
              <label key={r.id} className={cn("flex items-start gap-3 rounded-xl border p-3 text-sm", rewardId === r.id ? "border-loyalty bg-loyalty-soft" : "border-border", !can && "opacity-60")}>
                <input type="checkbox" disabled={!can} checked={rewardId === r.id} onChange={(e) => setRewardId(e.target.checked ? r.id : null)} className="mt-1" />
                <span>
                  <span className="flex items-center gap-1 font-semibold text-loyalty"><Gift className="size-4" /> {r.name} — {r.pointsRequired} pts</span>
                  <span className="text-xs text-muted-foreground">You have {balance} points{can ? "" : `. ${r.pointsRequired - balance} more needed.`}</span>
                </span>
              </label>
            );
          })}

          <dl className="space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><dt>Item subtotal</dt><dd>{formatPKR(totals.subtotal)}</dd></div>
            {totals.discount > 0 && <div className="flex justify-between text-primary"><dt>Promo discount</dt><dd>-{formatPKR(totals.discount)}</dd></div>}
            {rewardId && <div className="flex justify-between text-loyalty"><dt>Reward item</dt><dd>Free</dd></div>}
            <div className="flex justify-between"><dt>Delivery fee</dt><dd>{totals.deliveryFee === 0 ? (creditOn ? <span className="text-loyalty">Covered by plan</span> : "Free") : formatPKR(totals.deliveryFee)}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-lg font-extrabold"><dt>Pay on delivery</dt><dd>{formatPKR(totals.total)}</dd></div>
          </dl>
          {totals.pointsToEarn > 0 && <p className="text-xs font-semibold text-loyalty">Earn {totals.pointsToEarn} points after delivery.</p>}
          {error && <div role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</div>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Placing order…" : "Place order"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">We check stock, prices and your area before confirming. Nothing is charged online.</p>
        </div>
      </aside>
    </form>
  );
}
