import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock, Minus, PackageOpen, Plus, Repeat, ShoppingBasket, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Notice, PageHeader } from "@/components/site/Blocks";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { FREE_DELIVERY_THRESHOLD, formatPKR } from "@/lib/pricing";
import { bundlesQuery, catalogLiteQuery } from "@/lib/queries";
import {
  RATION_SIZES,
  RATION_TIERS,
  TIER_META,
  bundleSize,
  findBundle,
  type RationSize,
  type RationTier,
} from "@/lib/ration";
import { pageHead } from "@/lib/seo";
import type { Bundle, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  size: z.enum(["small", "medium", "large"]).optional().catch(undefined),
  plan: z.enum(["basic", "standard", "premium"]).optional().catch(undefined),
});

export const Route = createFileRoute("/ration")({
  head: () =>
    pageHead(
      "Monthly Ration",
      "Har Budget Ka Monthly Rashan — Basic, Standard and Premium monthly grocery plans for every family size, delivered in Islamabad and Rawalpindi.",
    ),
  validateSearch: (s) => searchSchema.parse(s),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(bundlesQuery);
    context.queryClient.ensureQueryData(catalogLiteQuery);
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="container-page py-12">
      {error instanceof Error ? error.message : "Could not load ration plans."}
    </div>
  ),
  component: RationBuilder,
});

type Line = { product: Product; quantity: number };

function RationBuilder() {
  const { data: bundles } = useSuspenseQuery(bundlesQuery);
  const { data: catalog } = useSuspenseQuery(catalogLiteQuery);
  const { size, plan } = Route.useSearch();
  const navigate = useNavigate();

  const activeSize: RationSize = size ?? "medium";
  const activePlan: RationTier = plan ?? "standard";
  const bundle = findBundle(bundles, activeSize, activePlan);

  const pick = (next: { size?: RationSize; plan?: RationTier }) =>
    navigate({
      to: "/ration",
      search: { size: next.size ?? activeSize, plan: next.plan ?? activePlan },
      replace: true,
    });

  return (
    <>
      <PageHeader
        eyebrow="Monthly Ration"
        title="Har Budget Ka Monthly Rashan."
        subtitle="Choose your family size, pick the quality that fits your budget, then customize every item before adding it to your cart."
      />
      <div className="container-page space-y-8 py-8">
        {/* Step 1: family size */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">1 · Your family size</h2>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Family size">
            {RATION_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick({ size: s.id })}
                aria-pressed={activeSize === s.id}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  activeSize === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50",
                )}
              >
                {s.label} <span className="font-normal opacity-80">({s.people})</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: quality plan */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">2 · Your quality plan</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {RATION_TIERS.map((tier) => {
              const meta = TIER_META[tier];
              const b = findBundle(bundles, activeSize, tier);
              const total = b ? b.items.reduce((s, i) => s + i.product.price * i.quantity, 0) : 0;
              const active = activePlan === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => pick({ plan: tier })}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg border bg-card p-4 text-left transition-colors",
                    active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{meta.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                        tier === "standard" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {meta.badge}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-primary">{meta.quality}</div>
                  <div className="mt-2 text-lg font-extrabold">{formatPKR(total)}</div>
                  <div className="text-xs text-muted-foreground">{b?.items.length ?? 0} products · live price</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 3: customize */}
        {bundle ? (
          <Builder key={bundle.id} bundle={bundle} catalog={catalog} />
        ) : (
          <Notice>No ration plan is available for this combination yet.</Notice>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: PackageOpen, t: "Built for families", d: "Staples sized for 2, 4 or 6+ people." },
            { icon: Truck, t: "Free delivery", d: `Most baskets cross ${formatPKR(FREE_DELIVERY_THRESHOLD)}, so delivery is free.` },
            { icon: CalendarClock, t: "Choose your slot", d: "Pick the day and time window at checkout." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card-surface flex gap-3 p-4">
              <Icon className="size-5 shrink-0 text-primary" />
              <div>
                <div className="font-bold">{t}</div>
                <div className="text-sm text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Builder({ bundle, catalog }: { bundle: Bundle; catalog: Product[] }) {
  const cart = useCart();
  const meta = TIER_META[bundle.tier];
  const [lines, setLines] = useState<Line[]>(() => bundle.items.map((i) => ({ product: i.product, quantity: i.quantity })));
  const [addId, setAddId] = useState("");

  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const inBasket = useMemo(() => new Set(lines.map((l) => l.product.id)), [lines]);
  const addable = useMemo(() => catalog.filter((p) => !inBasket.has(p.id)), [catalog, inBasket]);

  const total = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const unavailable = lines.filter((l) => l.product.stock < l.quantity);

  const setQty = (id: string, qty: number) =>
    setLines((ls) =>
      ls.map((l) =>
        l.product.id === id
          ? { ...l, quantity: Math.max(1, Math.min(qty, Math.max(l.product.maxPerOrder, 1), Math.max(l.product.stock, 1))) }
          : l,
      ),
    );
  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.product.id !== id));
  const swap = (id: string, nextId: string) => {
    const next = byId.get(nextId);
    if (!next) return;
    setLines((ls) => ls.map((l) => (l.product.id === id ? { product: next, quantity: l.quantity } : l)));
    toast.success(`Swapped to ${next.name}`);
  };
  const addProduct = () => {
    const p = byId.get(addId);
    if (!p) return;
    setLines((ls) => [...ls, { product: p, quantity: 1 }]);
    setAddId("");
    toast.success(`${p.name} added to your ration`);
  };

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        3 · Customize your {meta.name} basket ({bundle.householdLabel})
      </h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {lines.map((l) => {
            const alternatives = catalog.filter((p) => p.categoryId === l.product.categoryId && p.id !== l.product.id);
            const outOfStock = l.product.stock < l.quantity;
            return (
              <div key={l.product.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
                {l.product.image ? (
                  <img src={l.product.image} alt="" className="size-12 rounded-md object-cover" loading="lazy" />
                ) : (
                  <div className="grid size-12 place-items-center rounded-md bg-secondary">
                    <PackageOpen className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-sm font-semibold", outOfStock && "text-muted-foreground line-through")}>
                    {l.product.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[l.product.brand, l.product.packSize].filter(Boolean).join(" · ")} · {formatPKR(l.product.price)}
                  </div>
                  {alternatives.length > 0 && (
                    <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Repeat className="size-3.5" />
                      <select
                        className="h-7 max-w-52 rounded-md border border-border bg-background px-1.5 text-xs"
                        value={l.product.id}
                        onChange={(e) => swap(l.product.id, e.target.value)}
                        aria-label={`Swap ${l.product.name}`}
                      >
                        <option value={l.product.id}>{l.product.name}</option>
                        {alternatives.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} — {formatPKR(a.price)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(l.product.id, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="Decrease quantity">
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-bold">{l.quantity}</span>
                  <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(l.product.id, l.quantity + 1)} aria-label="Increase quantity">
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="w-20 text-right text-sm font-bold">{formatPKR(l.product.price * l.quantity)}</div>
                <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeLine(l.product.id)} aria-label={`Remove ${l.product.name}`}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}

          {/* Add more products */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
            <select
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
              aria-label="Choose a product to add"
            >
              <option value="">Add another product…</option>
              {addable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.packSize}) — {formatPKR(p.price)}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={addProduct} disabled={!addId}>
              <Plus /> Add
            </Button>
          </div>
        </div>

        {/* Live summary */}
        <aside className="h-fit rounded-lg border border-border bg-card p-5 lg:sticky lg:top-20">
          <div className="text-sm font-bold">
            {meta.name} · {bundle.householdLabel}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{lines.length} products in your basket</div>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Total (live prices)</span>
            <span className="text-2xl font-extrabold">{formatPKR(total)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {total >= FREE_DELIVERY_THRESHOLD
              ? "Free delivery included."
              : `Add ${formatPKR(FREE_DELIVERY_THRESHOLD - total)} more for free delivery.`}
          </p>
          {unavailable.length > 0 && (
            <p className="mt-2 text-xs text-warning">
              {unavailable.length} item(s) are short on stock and will be skipped.
            </p>
          )}
          <Button
            className="mt-4 w-full"
            disabled={lines.length === 0}
            onClick={() => {
              const ok = lines.filter((l) => l.product.stock >= l.quantity);
              cart.addMany(ok);
              toast.success(`${meta.name} ration added to cart`, {
                action: { label: "View cart", onClick: () => void 0 },
              });
            }}
          >
            <ShoppingBasket /> Add to Cart
          </Button>
          <Button variant="outline" asChild className="mt-2 w-full">
            <Link to="/cart">Go to cart</Link>
          </Button>
        </aside>
      </div>
    </section>
  );
}
