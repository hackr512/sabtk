import { DeliveryPlanSelection, SelectedDeliveryPlan, deliveryPlansQuery } from "@/components/plans/DeliveryPlanSelection";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { EmptyState } from "@/components/site/Blocks";
import { useCart } from "@/hooks/use-cart";
import { getProductsByIds } from "@/lib/catalog.functions";
import { formatPKR } from "@/lib/pricing";
import { computeTotals, configuredDeliveryFee } from "@/lib/pricing";
import { storeConfigQuery } from "@/lib/queries";
import { deliveryPlanTotals } from "@/lib/delivery-plan";
import { getMyMembership } from "@/lib/membership.functions";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useArea } from "@/hooks/use-area";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — SabTk" },
      { name: "description", content: "Review your SabTk grocery cart, delivery fee and total before checkout." },
      { property: "og:title", content: "Your cart — SabTk" },
      { property: "og:description", content: "Review items, delivery fee and total in PKR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(deliveryPlansQuery),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { data: config } = useQuery(storeConfigQuery);
  const { user } = useAuth();
  const { zoneId } = useArea();
  const membershipFn = useServerFn(getMyMembership);
  const { data: membership } = useQuery({ queryKey: ["my-membership", user?.id], enabled: !!user, queryFn: () => membershipFn(), staleTime: 0 });
  const fetchProducts = useServerFn(getProductsByIds);
  const refreshed = useRef(false);

  // Refresh prices and stock from the catalogue once the saved cart loads.
  useEffect(() => {
    if (!cart.ready || refreshed.current || cart.items.length === 0) return;
    refreshed.current = true;
    fetchProducts({ data: { ids: cart.items.map((i) => i.productId) } }).then(cart.refresh).catch(() => {});
  }, [cart.ready, cart.items, cart.refresh, fetchProducts]);

  if (cart.ready && cart.items.length === 0) {
    return (
      <div className="container-page py-12">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          action={
            <Button asChild>
              <Link to="/shop">Start shopping</Link>
            </Button>
          }
        >
          Add groceries or a monthly ration bundle to get started.
        </EmptyState>
      </div>
    );
  }

  const active = membership?.current?.status === "active" ? membership.current : null;
  const t = deliveryPlanTotals(computeTotals(cart.items.filter(i => i.quantity > 0).map(i => ({ unitPrice: i.price, quantity: i.quantity, pointsEligible: i.pointsEligible })), null, configuredDeliveryFee(config?.settings.delivery_fee)), cart.selectedPlan, active ? { creditsAvailable: active.credits.available, minBasket: active.minBasket, zoneIds: active.zoneIds } : null, zoneId);

  return (
    <div className="container-page py-6 md:py-10">
      <h1 className="text-3xl font-extrabold md:text-4xl">Your cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div><ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {cart.items.map((i) => {
            const unavailable = i.stock <= 0 || i.quantity === 0;
            return (
              <li key={i.productId} className="flex gap-4 p-4">
                {i.image && (
                  <img src={i.image} alt="" width={80} height={80} className="size-20 shrink-0 rounded-xl bg-surface object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <Link to="/product/$slug" params={{ slug: i.slug }} className="font-semibold hover:text-primary">
                    {i.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {[i.brand, i.packSize].filter(Boolean).join(" · ")} · {formatPKR(i.price)} each
                  </div>
                  {unavailable && <div className="mt-1 text-xs font-semibold text-destructive">No longer available — remove to continue</div>}
                  <div className="mt-3 flex items-center gap-3">
                    {!unavailable && (
                      <QuantityStepper
                        size="sm"
                        value={i.quantity}
                        max={Math.min(i.stock, i.maxPerOrder)}
                        onChange={(v) => cart.setQuantity(i.productId, v)}
                        label={`Quantity of ${i.name}`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => cart.remove(i.productId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </button>
                  </div>
                </div>
                <div className="text-right font-bold">{formatPKR(i.price * i.quantity)}</div>
              </li>
            );
          })}
        </ul><div className="mt-4"><SelectedDeliveryPlan /></div><DeliveryPlanSelection /></div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card lg:sticky lg:top-40">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Grocery subtotal</dt><dd>{formatPKR(t.subtotal)}</dd></div>
            {cart.selectedPlan && <div className="flex justify-between"><dt>Delivery plan · {cart.selectedPlan.name}</dt><dd>{formatPKR(cart.selectedPlan.price)}</dd></div>}
            <div className="flex justify-between gap-3"><dt>Delivery fee</dt><dd>{t.decision.applies ? "Rs. 0 · Covered by plan" : formatPKR(t.deliveryFee)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Promo codes & rewards</dt><dd>Applied at checkout</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold"><dt>Total</dt><dd>{formatPKR(t.total)}</dd></div>
          </dl>
          {t.decision.applies && <p className="text-xs text-loyalty">{cart.selectedPlan ? `First delivery included. ${cart.selectedPlan.credits - 1} credits unlock after payment confirmation.` : `${active?.planName} · 1 credit applied automatically; ${Math.max(0, (active?.credits.available ?? 1) - 1)} remaining after reservation.`}</p>}
          {t.decision.reason && <p className="text-xs text-muted-foreground">{t.decision.reason}</p>}
          {t.pointsToEarn > 0 && (
            <p className="rounded-xl bg-loyalty-soft px-3 py-2 text-xs font-semibold text-loyalty">
              You'll earn {t.pointsToEarn} points once this order is delivered.
            </p>
          )}
          <Button asChild size="lg" className="w-full" disabled={cart.count === 0}>
            <Link to="/checkout">Proceed to checkout</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">No other charges. Prices are confirmed when you place the order.</p>
        </aside>
      </div>
    </div>
  );
}
