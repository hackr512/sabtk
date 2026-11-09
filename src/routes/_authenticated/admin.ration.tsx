import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminTitle, Empty, report, reportError } from "@/components/admin/AdminBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  adminListProducts,
  adminListRationBundles,
  adminRemoveRationItem,
  adminSetRationItem,
  adminUpdateRationBundle,
} from "@/lib/admin.functions";
import { formatPKR } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/ration")({
  component: RationPlans,
});

type BundleRow = Awaited<ReturnType<typeof adminListRationBundles>>[number];

const TIER_LABEL: Record<string, string> = { basic: "Basic", standard: "Standard", premium: "Premium" };

function RationPlans() {
  const listFn = useServerFn(adminListRationBundles);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "ration"], queryFn: () => listFn() });
  const [selected, setSelected] = useState<string | null>(null);

  const bundle = data?.find((b) => b.id === selected) ?? data?.[0];

  return (
    <>
      <AdminTitle
        title="Monthly Ration Plans"
        subtitle="Basic, Standard and Premium baskets for each family size. Prices are always calculated live from current product prices."
      />
      {isLoading ? (
        <Empty>Loading…</Empty>
      ) : !data?.length ? (
        <Empty>No ration plans set up.</Empty>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {data.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  bundle?.id === b.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50",
                  !b.is_active && "opacity-50 line-through",
                )}
              >
                {TIER_LABEL[b.quality_tier] ?? b.quality_tier} · {b.household_label}
              </button>
            ))}
          </div>
          {bundle && <BundleEditor key={bundle.id} bundle={bundle} />}
        </div>
      )}
    </>
  );
}

function BundleEditor({ bundle }: { bundle: BundleRow }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "ration"] });

  const saveFn = useServerFn(adminUpdateRationBundle);
  const setItemFn = useServerFn(adminSetRationItem);
  const removeItemFn = useServerFn(adminRemoveRationItem);
  const productsFn = useServerFn(adminListProducts);

  const [name, setName] = useState(bundle.name);
  const [description, setDescription] = useState(bundle.description ?? "");
  const [isActive, setIsActive] = useState(bundle.is_active);
  const [addId, setAddId] = useState("");
  const [addQty, setAddQty] = useState("1");

  const { data: products } = useQuery({ queryKey: ["admin", "products"], queryFn: () => productsFn({ data: {} }) });

  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: bundle.id, name, description, isActive } }),
    onSuccess: (r) => { report(r, "Plan saved"); refresh(); },
    onError: reportError,
  });
  const setItem = useMutation({
    mutationFn: (v: { productId: string; quantity: number }) => setItemFn({ data: { bundleId: bundle.id, ...v } }),
    onSuccess: (r) => { report(r, "Item saved"); refresh(); },
    onError: reportError,
  });
  const removeItem = useMutation({
    mutationFn: (productId: string) => removeItemFn({ data: { bundleId: bundle.id, productId } }),
    onSuccess: (r) => { report(r, "Item removed"); refresh(); },
    onError: reportError,
  });

  const inBundle = new Set(bundle.items.map((i) => i.productId));
  const addable = (products ?? []).filter((p: any) => !inBundle.has(p.id) && p.is_active !== false);
  const total = bundle.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <Label htmlFor="rb-name">Plan name</Label>
          <Input id="rb-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="rb-desc">Description</Label>
          <Textarea id="rb-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={1} className="mt-1" />
        </div>
        <div className="flex items-end gap-3 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} /> Visible
          </label>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-semibold">Product</th>
              <th className="py-2 pr-3 font-semibold">Price</th>
              <th className="py-2 pr-3 font-semibold">Stock</th>
              <th className="py-2 pr-3 font-semibold">Qty</th>
              <th className="py-2 pr-3 text-right font-semibold">Line total</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {bundle.items.map((i) => (
              <tr key={i.productId} className="border-b border-border/60">
                <td className="py-2 pr-3">
                  <div className="font-medium">{i.product.name}</div>
                  <div className="text-xs text-muted-foreground">{[i.product.brand, i.product.pack_size].filter(Boolean).join(" · ")}</div>
                </td>
                <td className="py-2 pr-3">{formatPKR(Number(i.product.price))}</td>
                <td className={cn("py-2 pr-3", i.product.stock_quantity < i.quantity && "font-semibold text-warning")}>
                  {i.product.stock_quantity}
                </td>
                <td className="py-2 pr-3">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    defaultValue={i.quantity}
                    className="h-8 w-20"
                    onBlur={(e) => {
                      const q = Number(e.target.value);
                      if (Number.isInteger(q) && q >= 1 && q !== i.quantity) setItem.mutate({ productId: i.productId, quantity: q });
                    }}
                  />
                </td>
                <td className="py-2 pr-3 text-right font-semibold">{formatPKR(Number(i.product.price) * i.quantity)}</td>
                <td className="py-2 text-right">
                  <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem.mutate(i.productId)} aria-label={`Remove ${i.product.name}`}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="py-2 text-sm font-semibold text-muted-foreground">Basket total (live prices)</td>
              <td className="py-2 text-right text-lg font-extrabold">{formatPKR(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <div className="min-w-56 flex-1">
          <Label htmlFor="rb-add">Add a product</Label>
          <select id="rb-add" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm" value={addId} onChange={(e) => setAddId(e.target.value)}>
            <option value="">Choose a product…</option>
            {addable.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.pack_size}) — {formatPKR(Number(p.price))}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <Label htmlFor="rb-qty">Qty</Label>
          <Input id="rb-qty" type="number" min={1} max={99} value={addQty} onChange={(e) => setAddQty(e.target.value)} className="mt-1" />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!addId || setItem.isPending}
          onClick={() => {
            const q = Number(addQty);
            if (!addId || !Number.isInteger(q) || q < 1) return;
            setItem.mutate({ productId: addId, quantity: q });
            setAddId("");
            setAddQty("1");
          }}
        >
          <Plus /> Add item
        </Button>
      </div>
    </div>
  );
}
