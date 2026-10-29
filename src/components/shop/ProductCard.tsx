import { Link } from "@tanstack/react-router";
import { Heart, Plus, Sparkles } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-customer";
import { formatPKR, pointsForAmount, unitPriceLabel } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "./QuantityStepper";

export function StockLabel({ stock, className }: { stock: number; className?: string }) {
  if (stock <= 0)
    return <span className={cn("text-xs font-semibold text-destructive", className)}>Out of stock</span>;
  if (stock <= 5)
    return <span className={cn("text-xs font-semibold text-warning", className)}>Only {stock} left</span>;
  return <span className={cn("text-xs font-medium text-success", className)}>In stock</span>;
}

export function ProductCard({ product, note }: { product: Product; note?: string | undefined }) {
  const cart = useCart();
  const { saved, toggle } = useWishlist();
  const qty = cart.quantityOf(product.id);
  const max = Math.min(product.stock, product.maxPerOrder);
  const unit = unitPriceLabel(product.price, product.unit, product.unitQuantity);
  const points = product.pointsEligible ? pointsForAmount(product.price) : 0;
  const isSaved = saved.has(product.id);
  const out = product.stock <= 0;

  return (
    <article className="group relative flex flex-col h-full rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => toggle(product.id)}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
        className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-lg bg-card/90 text-muted-foreground shadow-sm backdrop-blur hover:text-loyalty"
      >
        <Heart className={cn("size-4", isSaved && "fill-loyalty text-loyalty")} />
      </Button>
      {product.compareAtPrice && (
        <span className="absolute left-4 top-4 z-10 rounded-md bg-lime px-2 py-0.5 text-[11px] font-bold text-lime-foreground">
          Save {formatPKR(product.compareAtPrice - product.price)}
        </span>
      )}
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="block overflow-hidden rounded-md bg-surface"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={400}
            height={400}
            className={cn(
              "aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
              out && "opacity-50 grayscale",
            )}
          />
        ) : (
          <div className="aspect-square w-full" />
        )}
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-muted-foreground">
            {product.brand ?? "\u00A0"}
          </span>
          <StockLabel stock={product.stock} />
        </div>
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="mt-1 min-h-[2.75em] line-clamp-2 text-sm font-semibold leading-snug text-foreground hover:text-primary"
        >
          {product.name}
        </Link>
        <span className="mt-0.5 text-xs text-muted-foreground">{product.packSize}</span>
        {note && <span className="mt-1 text-[11px] font-medium text-primary">{note}</span>}

        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-lg font-semibold text-foreground">{formatPKR(product.price)}</span>
                {product.compareAtPrice && (
                  <s className="text-xs text-muted-foreground">{formatPKR(product.compareAtPrice)}</s>
                )}
              </div>
              {unit && <div className="text-[11px] text-muted-foreground">{unit}</div>}
            </div>
            {qty > 0 ? (
              <QuantityStepper
                size="sm"
                value={qty}
                max={max}
                onChange={(v) => cart.setQuantity(product.id, v)}
                label={`Quantity of ${product.name}`}
              />
            ) : (
              <Button
                type="button"
                size="icon-sm"
                title={`Add ${product.name} to cart`}
                disabled={out}
                onClick={() => cart.add(product)}
                className="size-8 shrink-0 rounded-md"
                aria-label={`Add ${product.name} to cart`}
              >
                <Plus className="size-3.5" />
              </Button>
            )}
          </div>
          {points > 0 && (
            <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-loyalty">
              <Sparkles className="size-3" />
              Earn {points} pt{points > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, notes }: { products: Product[]; notes?: Record<string, string> | undefined }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} note={notes?.[p.id]} />
      ))}
    </div>
  );
}

export function ProductRail({ products, notes }: { products: Product[]; notes?: Record<string, string> | undefined }) {
  return (
    <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 items-stretch md:mx-0 md:px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[18.5%]">
          <ProductCard product={p} note={notes?.[p.id]} />
        </div>
      ))}
    </div>
  );
}
