import { Link } from "@tanstack/react-router";
import { Check, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatPKR } from "@/lib/pricing";
import type { Bundle } from "@/lib/types";
import { cn } from "@/lib/utils";

export function bundleTotals(b: Bundle) {
  const available = b.items.filter((i) => i.product.stock >= i.quantity);
  const total = available.reduce((s, i) => s + i.product.price * i.quantity, 0);
  return { total, unavailable: b.items.length - available.length, units: b.items.reduce((s, i) => s + i.quantity, 0) };
}

export function BundleCard({ bundle, highlight = false }: { bundle: Bundle; highlight?: boolean }) {
  const cart = useCart();
  const { total, unavailable } = bundleTotals(bundle);
  const shown = bundle.items.slice(0, 6);

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 shadow-card",
        highlight ? "border-primary ring-2 ring-primary/15" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
          {bundle.householdLabel}
        </span>
        <span className="text-xs text-muted-foreground">{bundle.items.length} products</span>
      </div>
      <h3 className="mt-3 text-xl font-bold">{bundle.name}</h3>
      {bundle.description && <p className="mt-1 text-sm text-muted-foreground">{bundle.description}</p>}
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
            onClick={() => {
              cart.addMany(bundle.items);
              toast.success(`${bundle.name} added to cart`);
            }}
          >
            <ShoppingBasket /> Add all
          </Button>
          <Button variant="outline" asChild>
            <Link to="/ration" search={{ bundle: bundle.slug }}>
              Customize
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
