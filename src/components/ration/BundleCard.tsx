import { Link } from "@tanstack/react-router";
import { Check, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatPKR } from "@/lib/pricing";
import { TIER_META, bundleSize } from "@/lib/ration";
import type { Bundle } from "@/lib/types";
import { cn } from "@/lib/utils";

export function bundleTotals(b: Bundle) {
  const available = b.items.filter((i) => i.product.stock >= i.quantity);
  const total = available.reduce((s, i) => s + i.product.price * i.quantity, 0);
  return { total, unavailable: b.items.length - available.length, units: b.items.reduce((s, i) => s + i.quantity, 0) };
}

/** Quality-plan card (Basic / Standard / Premium) for one family size. Prices are live from product data. */
export function PlanCard({ bundle }: { bundle: Bundle }) {
  const cart = useCart();
  const meta = TIER_META[bundle.tier];
  const size = bundleSize(bundle);
  const { total, unavailable } = bundleTotals(bundle);
  const shown = bundle.items.slice(0, 5);
  const highlight = bundle.tier === "standard";

  return (
    <article
      className={cn(
        "flex flex-col rounded-lg border bg-card p-5",
        highlight ? "border-primary ring-2 ring-primary/30" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          {meta.badge}
        </span>
        <span className="text-xs text-muted-foreground">{bundle.items.length} products</span>
      </div>
      <h3 className="mt-3 text-xl font-bold">{meta.name}</h3>
      <p className="text-sm font-semibold text-primary">{meta.quality}</p>
      <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {shown.map((i) => (
          <li key={i.product.id} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className={cn("flex-1", i.product.stock < i.quantity && "text-muted-foreground line-through")}>
              {i.quantity} × {i.product.name} <span className="text-muted-foreground">({i.product.packSize})</span>
            </span>
          </li>
        ))}
        {bundle.items.length > shown.length && (
          <li className="pl-6 text-xs font-semibold text-primary">+ {bundle.items.length - shown.length} more items</li>
        )}
      </ul>
      <div className="mt-auto pt-5">
        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Basket total (current prices)</span>
          <span className="text-2xl font-extrabold">{formatPKR(total)}</span>
        </div>
        {unavailable > 0 && (
          <p className="mt-1 text-xs text-warning">{unavailable} item(s) currently out of stock and excluded.</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => {
              cart.addMany(bundle.items);
              toast.success(`${meta.name} ration (${bundle.householdLabel}) added to cart`);
            }}
          >
            <ShoppingBasket /> Add to Cart
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/ration" search={{ size, plan: bundle.tier }}>
              Customize Plan
            </Link>
          </Button>
        </div>
        <Button size="sm" variant="ghost" asChild className="mt-2 w-full">
          <Link to="/ration" search={{ size, plan: bundle.tier }}>
            View Products
          </Link>
        </Button>
      </div>
    </article>
  );
}
