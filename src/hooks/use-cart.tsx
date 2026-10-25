import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { computeTotals, type OrderTotals } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  brand: string | null;
  packSize: string;
  image: string | null;
  price: number;
  stock: number;
  maxPerOrder: number;
  pointsEligible: boolean;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  ready: boolean;
  count: number;
  totals: OrderTotals;
  quantityOf: (productId: string) => number;
  add: (p: Product, qty?: number) => void;
  setQuantity: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  addMany: (lines: { product: Product; quantity: number }[]) => void;
  refresh: (fresh: Product[]) => void;
};

const KEY = "sabtk-cart-v1";
const CartContext = createContext<CartState | null>(null);

function toItem(p: Product, quantity: number): CartItem {
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    packSize: p.packSize,
    image: p.image,
    price: p.price,
    stock: p.stock,
    maxPerOrder: p.maxPerOrder,
    pointsEligible: p.pointsEligible,
    quantity,
  };
}

const cap = (i: Pick<CartItem, "stock" | "maxPerOrder">) => Math.max(0, Math.min(i.stock, i.maxPerOrder));

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore corrupt cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const add = useCallback((p: Product, qty = 1) => {
    if (p.stock <= 0) {
      toast.error(`${p.name} is out of stock`);
      return;
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      const limit = cap(p);
      const nextQty = Math.min(limit, (existing?.quantity ?? 0) + qty);
      if (existing && nextQty === existing.quantity) {
        toast.message(`Maximum available quantity for ${p.name} reached`);
        return prev;
      }
      if (existing) return prev.map((i) => (i.productId === p.id ? { ...toItem(p, nextQty) } : i));
      return [...prev, toItem(p, nextQty)];
    });
  }, []);

  const setQuantity = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(qty, cap(i)) } : i)),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const addMany = useCallback((lines: { product: Product; quantity: number }[]) => {
    let skipped = 0;
    setItems((prev) => {
      const next = [...prev];
      for (const { product, quantity } of lines) {
        if (product.stock <= 0) {
          skipped++;
          continue;
        }
        const idx = next.findIndex((i) => i.productId === product.id);
        const q = Math.min(cap(product), (idx >= 0 ? next[idx].quantity : 0) + quantity);
        if (idx >= 0) next[idx] = toItem(product, q);
        else next.push(toItem(product, q));
      }
      return next;
    });
    if (skipped) toast.message(`${skipped} item(s) skipped because they're out of stock`);
  }, []);

  /** Replace cached price/stock with fresh catalogue data. */
  const refresh = useCallback((fresh: Product[]) => {
    setItems((prev) =>
      prev.map((i) => {
        const f = fresh.find((p) => p.id === i.productId);
        // Missing = no longer sold. Keep the line visible (qty 0) so the customer sees why.
        if (!f) return { ...i, stock: 0, quantity: 0 };
        return toItem(f, Math.min(Math.max(i.quantity, 1), cap(f)));
      }),
    );
  }, []);

  const value = useMemo<CartState>(() => {
    const priced = items.filter((i) => i.quantity > 0);
    return {
      items,
      ready,
      count: priced.reduce((s, i) => s + i.quantity, 0),
      totals: computeTotals(
        priced.map((i) => ({ unitPrice: i.price, quantity: i.quantity, pointsEligible: i.pointsEligible })),
      ),
      quantityOf: (id) => items.find((i) => i.productId === id)?.quantity ?? 0,
      add,
      setQuantity,
      remove,
      clear,
      addMany,
      refresh,
    };
  }, [items, ready, add, setQuantity, remove, clear, addMany, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
