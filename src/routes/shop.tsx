import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProductGrid } from "@/components/shop/ProductCard";
import { EmptyState, LoadingGrid } from "@/components/site/Blocks";
import { shopQuery, storeConfigQuery } from "@/lib/queries";
import type { ShopFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().max(80).optional().catch(undefined),
  category: z.string().max(80).optional().catch(undefined),
  brands: z.string().max(400).optional().catch(undefined),
  min: z.coerce.number().min(0).optional().catch(undefined),
  max: z.coerce.number().min(0).optional().catch(undefined),
  inStock: z.coerce.boolean().optional().catch(undefined),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

type ShopSearch = z.infer<typeof searchSchema>;

function toFilters(s: ShopSearch): ShopFilters {
  const f: ShopFilters = {};
  if (s.q) f.q = s.q;
  if (s.category) f.category = s.category;
  if (s.brands) f.brands = s.brands.split(",").filter(Boolean);
  if (s.min != null) f.min = s.min;
  if (s.max != null) f.max = s.max;
  if (s.inStock) f.inStock = true;
  if (s.sort) f.sort = s.sort;
  if (s.page) f.page = s.page;
  return f;
}

export const Route = createFileRoute("/shop")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(shopQuery(toFilters(deps))),
  head: () => ({
    meta: [
      { title: "Shop groceries — SabTk" },
      { name: "description", content: "Browse atta, rice, daal, cooking oil, dairy, snacks and household essentials with delivery in Islamabad & Rawalpindi." },
      { property: "og:title", content: "Shop groceries — SabTk" },
      { property: "og:description", content: "Search and filter SabTk's grocery catalogue by category, brand, price and availability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const filters = toFilters(search);
  const { data, isFetching } = useQuery({ ...shopQuery(filters), placeholderData: (p) => p });
  const { data: config } = useQuery(storeConfigQuery);
  const category = config?.categories.find((c) => c.slug === search.category);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const page = search.page ?? 1;

  const update = (patch: Partial<ShopSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), resetScroll: false });

  const filterPanel = <Filters search={search} update={update} />;

  return (
    <div className="container-page py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold md:text-4xl">
            {search.q ? `Results for “${search.q}”` : (category?.name ?? "All groceries")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} product${data.total === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">{filterPanel}</div>
            </SheetContent>
          </Sheet>
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            value={search.sort ?? "relevance"}
            onChange={(e) => update({ sort: e.target.value as ShopSearch["sort"] })}
            className="h-10 rounded-full border border-input bg-card px-4 text-sm font-semibold outline-none focus:border-primary"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="price_asc">Price: Low to high</option>
            <option value="price_desc">Price: High to low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{filterPanel}</aside>
        <div className={cn(isFetching && "opacity-70 transition-opacity")}>
          {!data ? (
            <LoadingGrid />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No products found"
              action={
                <Button variant="outline" onClick={() => navigate({ search: {} })}>
                  Clear all filters
                </Button>
              }
            >
              Try a different spelling, fewer filters or browse a category.
            </EmptyState>
          ) : (
            <ProductGrid products={data.items} />
          )}

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 }) })}
              >
                Previous
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })}
              >
                Next
              </Button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function Filters({ search, update }: { search: ShopSearch; update: (p: Partial<ShopSearch>) => void }) {
  const { data: config } = useQuery(storeConfigQuery);
  const selectedBrands = (search.brands ?? "").split(",").filter(Boolean);
  const [min, setMin] = useState(search.min?.toString() ?? "");
  const [max, setMax] = useState(search.max?.toString() ?? "");

  return (
    <div className="space-y-7 text-sm">
      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</h2>
        <ul className="space-y-0.5">
          <li>
            <Link
              to="/shop"
              search={(p: ShopSearch) => ({ ...p, category: undefined, page: undefined })}
              className={cn("block rounded-lg px-2 py-1.5 hover:bg-muted", !search.category && "bg-secondary font-semibold text-secondary-foreground")}
            >
              All categories
            </Link>
          </li>
          {config?.categories.map((c) => (
            <li key={c.id}>
              <Link
                to="/shop"
                search={(p: ShopSearch) => ({ ...p, category: c.slug, page: undefined })}
                className={cn(
                  "block rounded-lg px-2 py-1.5 hover:bg-muted",
                  search.category === c.slug && "bg-secondary font-semibold text-secondary-foreground",
                )}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand</h2>
        <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {config?.brands.map((b) => {
            const on = selectedBrands.includes(b);
            return (
              <li key={b}>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={on}
                    onCheckedChange={() => {
                      const next = on ? selectedBrands.filter((x) => x !== b) : [...selectedBrands, b];
                      update({ brands: next.length ? next.join(",") : undefined });
                    }}
                  />
                  {b}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (Rs.)</h2>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ min: min ? Number(min) : undefined, max: max ? Number(max) : undefined });
          }}
        >
          <input
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
            className="h-9 w-full rounded-lg border border-input bg-card px-2 outline-none focus:border-primary"
          />
          <span className="text-muted-foreground">–</span>
          <input
            inputMode="numeric"
            placeholder="Max"
            aria-label="Maximum price"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
            className="h-9 w-full rounded-lg border border-input bg-card px-2 outline-none focus:border-primary"
          />
          <Button type="submit" size="sm" variant="secondary">
            Go
          </Button>
        </form>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox checked={!!search.inStock} onCheckedChange={(v) => update({ inStock: v ? true : undefined })} />
        In stock only
      </label>
    </div>
  );
}
