import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Tag, LayoutGrid, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchProducts } from "@/lib/catalog.functions";
import { formatPKR } from "@/lib/pricing";
import { storeConfigQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function SearchBar({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(term.trim(), 200);
  const navigate = useNavigate();
  const wrap = useRef<HTMLDivElement>(null);
  const { data: config } = useQuery(storeConfigQuery);

  const { data, isFetching } = useQuery({
    queryKey: ["suggest", debounced],
    enabled: debounced.length >= 2,
    queryFn: () => searchProducts({ data: { q: debounced, pageSize: 6 } }),
    staleTime: 30_000,
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const lower = debounced.toLowerCase();
  const cats = lower.length >= 2 ? (config?.categories ?? []).filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 3) : [];
  const brands = lower.length >= 2 ? (config?.brands ?? []).filter((b) => b.toLowerCase().includes(lower)).slice(0, 3) : [];
  const products = data?.items ?? [];
  const showPanel = open && debounced.length >= 2;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate({ to: "/shop", search: { q: term.trim() || undefined } });
  };

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <form onSubmit={submit} role="search">
        <label htmlFor="site-search" className="sr-only">
          Search products, brands and categories
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="site-search"
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search atta, daal, Tapal, cooking oil…"
          className="h-11 w-full rounded-full border border-input bg-surface pl-11 pr-10 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20"
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-pop">
          {(cats.length > 0 || brands.length > 0) && (
            <div className="flex flex-wrap gap-2 border-b border-border p-3">
              {cats.map((c) => (
                <Link
                  key={c.id}
                  to="/shop"
                  search={{ category: c.slug }}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:bg-accent"
                >
                  <LayoutGrid className="size-3" /> {c.name}
                </Link>
              ))}
              {brands.map((b) => (
                <Link
                  key={b}
                  to="/shop"
                  search={{ brands: b }}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-loyalty-soft px-3 py-1 text-xs font-semibold text-loyalty"
                >
                  <Tag className="size-3" /> {b}
                </Link>
              ))}
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto py-1">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  {p.image && (
                    <img src={p.image} alt="" width={40} height={40} className="size-10 rounded-lg object-cover" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[p.brand, p.packSize].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{formatPKR(p.price)}</span>
                </Link>
              </li>
            ))}
            {!isFetching && products.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No products match “{debounced}”.
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={submit}
            className="w-full border-t border-border px-4 py-2.5 text-left text-sm font-semibold text-primary hover:bg-muted"
          >
            See all results for “{debounced}”
          </button>
        </div>
      )}
    </div>
  );
}
