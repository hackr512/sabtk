import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { Notice, PageHeader } from "@/components/site/Blocks";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";
import { deliveryFeeFor, formatPKR } from "@/lib/pricing";
import { catalogLiteQuery } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/budget")({
  head: () => pageHead("GharBudget", "Set a monthly grocery budget, build your list, and see exactly where you stand before you order."),
  component: Budget,
});

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

function Budget() {
  const { user } = useAuth();
  const cart = useCart();
  const qc = useQueryClient();
  const { data: catalog = [] } = useQuery(catalogLiteQuery);
  const [budget, setBudget] = useState(25000);
  const [household, setHousehold] = useState(4);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: saved } = useQuery({
    queryKey: ["budget", user?.id, monthStart()],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("budget_plans").select("id, budget_amount, household_size, budget_plan_items(product_id, quantity)").eq("month", monthStart()).maybeSingle();
      return data;
    },
  });
  useEffect(() => {
    if (!saved) return;
    setBudget(Number(saved.budget_amount));
    setHousehold(saved.household_size);
    setQty(Object.fromEntries((saved.budget_plan_items ?? []).map((i) => [i.product_id, i.quantity])));
  }, [saved]);

  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const chosen = Object.entries(qty).filter(([id, n]) => n > 0 && byId.has(id)).map(([id, n]) => ({ product: byId.get(id)!, quantity: n }));
  const subtotal = chosen.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const total = subtotal + deliveryFeeFor(subtotal);
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
  const over = total > budget;
  const results = catalog.filter((p) => !q.trim() || `${p.name} ${p.brand ?? ""} ${p.categoryName ?? ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: plan, error } = await supabase
        .from("budget_plans")
        .upsert({ user_id: user.id, month: monthStart(), budget_amount: budget, household_size: household }, { onConflict: "user_id,month" })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("budget_plan_items").delete().eq("plan_id", plan.id);
      if (chosen.length) {
        const { error: e2 } = await supabase.from("budget_plan_items").insert(chosen.map((l) => ({ plan_id: plan.id, product_id: l.product.id, quantity: l.quantity })));
        if (e2) throw e2;
      }
      toast.success("Budget saved for this month");
      qc.invalidateQueries({ queryKey: ["budget"] });
    } catch {
      toast.error("Could not save your budget");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="GharBudget" title="Plan this month's groceries" subtitle="Set your budget, add what your family needs, and see the total with delivery before you order." />
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_380px]">
        <section className="card-surface space-y-4 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search atta, ghee, tea…" className="pl-9" aria-label="Search products" />
          </div>
          <ul className="divide-y divide-border">
            {results.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                {p.image ? <img src={p.image} alt="" className="size-12 rounded-lg object-cover" loading="lazy" /> : <div className="size-12 rounded-lg bg-muted" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.packSize} · {formatPKR(p.price)}</div>
                </div>
                <QuantityStepper size="sm" value={qty[p.id] ?? 0} max={Math.max(1, p.maxPerOrder)} onChange={(v) => setQty({ ...qty, [p.id]: v })} label={`Quantity of ${p.name}`} />
              </li>
            ))}
          </ul>
        </section>
        <aside className="h-fit space-y-4 lg:sticky lg:top-40">
          <div className="card-surface space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="budget">Monthly budget (Rs.)</Label>
                <Input id="budget" type="number" min={0} value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="household">People at home</Label>
                <Input id="household" type="number" min={1} max={20} value={household} onChange={(e) => setHousehold(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} className="mt-1" />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">{formatPKR(total)}</span>
                <span className={cn("font-semibold", over ? "text-destructive" : "text-primary")}>
                  {over ? `${formatPKR(total - budget)} over` : `${formatPKR(budget - total)} left`}
                </span>
              </div>
              <Progress value={pct} className={cn(over && "[&>div]:bg-destructive")} />
              <p className="mt-1 text-xs text-muted-foreground">Includes {deliveryFeeFor(subtotal) ? formatPKR(deliveryFeeFor(subtotal)) + " delivery" : "free delivery"} · about {formatPKR(Math.round(total / household))} per person</p>
            </div>
            {chosen.length > 0 && (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto border-t border-border pt-3 text-sm">
                {chosen.map((l) => (
                  <li key={l.product.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{l.quantity} × {l.product.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {formatPKR(l.product.price * l.quantity)}
                      <button type="button" aria-label={`Remove ${l.product.name}`} onClick={() => setQty({ ...qty, [l.product.id]: 0 })}><Trash2 className="size-3.5 text-muted-foreground" /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button className="w-full" disabled={!chosen.length} onClick={() => { cart.addMany(chosen); toast.success("Added to your cart"); }}>
              <ShoppingBag className="size-4" /> Add list to cart
            </Button>
            {user ? (
              <Button variant="outline" className="w-full" onClick={save} disabled={saving}><Calculator className="size-4" /> {saving ? "Saving…" : "Save this month's budget"}</Button>
            ) : (
              <Notice>
                <Link to="/auth" className="font-semibold text-primary underline">Sign in</Link> to save your budget and come back to it.
              </Notice>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
