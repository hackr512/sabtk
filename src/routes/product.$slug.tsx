import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Heart, MapPin, Sparkles, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductRail, StockLabel } from "@/components/shop/ProductCard";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { RecentlyViewed } from "@/components/shop/Recommendations";
import { useSelectedZone } from "@/components/site/AreaPicker";
import { SectionHeader } from "@/components/site/Blocks";
import { useCart } from "@/hooks/use-cart";
import { useRecentlyViewed, useWishlist } from "@/hooks/use-customer";
import { FREE_DELIVERY_THRESHOLD, formatPKR, pointsForAmount, unitPriceLabel } from "@/lib/pricing";
import { productQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const title = p ? `${p.brand ? `${p.brand} ` : ""}${p.name} ${p.packSize} — SabTk` : "Product unavailable — SabTk";
    const desc = p ? `${p.name} (${p.packSize}) for ${formatPKR(p.price)}. Order online with SabTk delivery in Islamabad & Rawalpindi.` : "This product isn't available.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(p ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <Link to="/shop" className="mt-4 inline-block font-semibold text-primary">Back to shop</Link>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const cart = useCart();
  const navigate = useNavigate();
  const { saved, toggle } = useWishlist();
  const zone = useSelectedZone();
  const { push } = useRecentlyViewed();
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);

  useEffect(() => {
    if (data?.product.id) push(data.product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.product.id]);

  if (!data) return null;
  const p = data.product;
  const max = Math.min(p.stock, p.maxPerOrder);
  const out = p.stock <= 0;
  const unit = unitPriceLabel(p.price, p.unit, p.unitQuantity);
  const points = p.pointsEligible ? pointsForAmount(p.price * qty) : 0;
  const images = p.images.length ? p.images : p.image ? [p.image] : [];
  const details = [
    ["Description", p.description],
    ["Ingredients", p.ingredients],
    ["Nutritional information", p.nutrition],
    ["Storage", p.storageInstructions],
    ["Expiry", p.expiryInfo],
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <div className="pb-6">
      <div className="container-page py-6 md:py-10">
        <nav className="mb-4 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          {p.categorySlug && (
            <>
              {" / "}
              <Link to="/shop" search={{ category: p.categorySlug }} className="hover:text-primary">
                {p.categoryName}
              </Link>
            </>
          )}
        </nav>
        <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
          <div>
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              {images[img] && (
                <img src={images[img]} alt={p.name} width={800} height={800} className="aspect-square w-full object-cover" />
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImg(i)}
                    className={cn("overflow-hidden rounded-xl border-2", i === img ? "border-primary" : "border-transparent")}
                    aria-label={`Show image ${i + 1}`}
                  >
                    <img src={src} alt="" width={72} height={72} className="size-16 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {p.brand && <div className="text-sm font-semibold text-primary">{p.brand}</div>}
            <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{p.packSize}</span>
              {p.sku && <span>SKU {p.sku}</span>}
              <StockLabel stock={p.stock} className="text-sm" />
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold">{formatPKR(p.price)}</span>
              {p.compareAtPrice && (
                <>
                  <s className="text-lg text-muted-foreground">{formatPKR(p.compareAtPrice)}</s>
                  <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-bold text-lime-foreground">
                    Save {formatPKR(p.compareAtPrice - p.price)}
                  </span>
                </>
              )}
            </div>
            {unit && <div className="text-sm text-muted-foreground">{unit}</div>}

            {points > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-loyalty-soft px-3 py-1.5 text-sm font-semibold text-loyalty">
                <Sparkles className="size-4" /> Earn {points} point{points > 1 ? "s" : ""} after delivery
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!out && <QuantityStepper size="lg" value={qty} max={max} onChange={(v) => setQty(Math.max(1, v))} />}
              <Button
                size="lg"
                disabled={out}
                onClick={() => {
                  cart.add(p, qty);
                  toast.success(`${p.name} added to cart`);
                }}
              >
                {out ? "Out of stock" : "Add to Cart"}
              </Button>
              {!out && (
                <Button
                  size="lg"
                  variant="lime"
                  onClick={() => {
                    cart.add(p, qty);
                    navigate({ to: "/cart" });
                  }}
                >
                  Buy Now
                </Button>
              )}
              <Button
                size="icon"
                variant="outline"
                className="size-12"
                aria-pressed={saved.has(p.id)}
                aria-label="Save product"
                onClick={() => toggle(p.id)}
              >
                <Heart className={cn(saved.has(p.id) && "fill-loyalty text-loyalty")} />
              </Button>
            </div>

            <div className="mt-6 space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {zone ? (
                  <span>
                    Delivers to <b>{zone.area}, {zone.city}</b>. Choose a delivery window from tomorrow at checkout.
                  </span>
                ) : (
                  <span>Select your area in the header to check delivery.</span>
                )}
              </div>
              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Free delivery on orders of {formatPKR(FREE_DELIVERY_THRESHOLD)}+, otherwise Rs. 150.</span>
              </div>
            </div>

            {details.length > 0 && (
              <dl className="mt-6 space-y-4">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-sm font-bold">{k}</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>

      {data.together.length > 0 && (
        <section className="container-page mt-8">
          <SectionHeader
            title="Frequently Bought Together"
            subtitle={data.togetherSource === "orders" ? "Based on what customers ordered together." : "Items that sit in the same SabTk ration bundles."}
          />
          <ProductRail products={data.together} />
        </section>
      )}
      {data.alternatives.length > 0 && (
        <section className="container-page mt-12">
          <SectionHeader title="Alternatives" subtitle="Other brands in this category." />
          <ProductRail products={data.alternatives} />
        </section>
      )}
      {data.related.length > 0 && (
        <section className="container-page mt-12">
          <SectionHeader title="Related products" />
          <ProductRail products={data.related} />
        </section>
      )}
      <RecentlyViewed excludeId={p.id} />
    </div>
  );
}
