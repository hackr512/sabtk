import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminCategories, adminSaveProduct, type ProductInput } from "@/lib/admin.functions";
import { formatPKR } from "@/lib/pricing";
import { report, reportError } from "./AdminBits";

type Values = {
  id?: string;
  name: string;
  categoryId: string;
  brand: string;
  images: string[];
  description: string;
  sku: string;
  purchaseCost: string;
  price: string;
  compareAtPrice: string;
  packSize: string;
  stock: string;
  maxPerOrder: string;
  status: "active" | "draft";
  featured: boolean;
  pointsEligible: boolean;
};

export const emptyProduct: Values = {
  name: "", categoryId: "", brand: "", images: [], description: "", sku: "",
  purchaseCost: "", price: "", compareAtPrice: "", packSize: "", stock: "0", maxPerOrder: "10",
  status: "draft", featured: false, pointsEligible: true,
};

export function toFormValues(p: {
  id: string; name: string; categoryId: string; brand: string; images: string[]; description: string; sku: string;
  purchaseCost: number | null; price: number; compareAtPrice: number | null; packSize: string; stock: number;
  maxPerOrder: number; status: "active" | "draft"; featured: boolean; pointsEligible: boolean;
}): Values {
  return {
    ...p,
    purchaseCost: p.purchaseCost?.toString() ?? "",
    price: p.price.toString(),
    compareAtPrice: p.compareAtPrice?.toString() ?? "",
    stock: p.stock.toString(),
    maxPerOrder: p.maxPerOrder.toString(),
  };
}

const num = (s: string) => (s.trim() === "" ? null : Number(s));

export function ProductForm({ initial }: { initial: Values }) {
  const [v, setV] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));
  const catFn = useServerFn(adminCategories);
  const saveFn = useServerFn(adminSaveProduct);
  const { data: cats } = useQuery({ queryKey: ["admin", "categories"], queryFn: () => catFn() });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const price = num(v.price);
  const cost = num(v.purchaseCost);
  const margin = price && cost != null && price > 0 ? price - cost : null;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, 6 - v.images.length)) {
        if (!f.type.startsWith("image/")) { toast.error(`${f.name} isn't an image`); continue; }
        if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} is larger than 5 MB`); continue; }
        const path = `products/${crypto.randomUUID()}.${f.name.split(".").pop() || "jpg"}`;
        const { error } = await supabase.storage.from("product-images").upload(path, f, { contentType: f.type });
        if (error) { toast.error("Photo upload failed"); continue; }
        // The photo store is private, so we keep a long-lasting (10-year) link for the shop to display.
        const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (data?.signedUrl) setV((s) => ({ ...s, images: [...s.images, data.signedUrl] }));
      }
    } finally {
      setUploading(false);
    }
  }

  async function submit(status: "active" | "draft") {
    if (price == null || Number.isNaN(price)) return toast.error("Enter a selling price");
    const input: ProductInput = {
      id: v.id,
      name: v.name,
      categoryId: v.categoryId,
      brand: v.brand,
      images: v.images,
      description: v.description,
      sku: v.sku,
      purchaseCost: cost,
      price,
      compareAtPrice: num(v.compareAtPrice),
      packSize: v.packSize,
      stock: Number(v.stock || 0),
      maxPerOrder: Number(v.maxPerOrder || 10),
      status,
      featured: v.featured,
      pointsEligible: v.pointsEligible,
    };
    setSaving(true);
    try {
      const r = await saveFn({ data: input });
      if (report(r, status === "active" ? "Product published" : "Saved as draft")) {
        qc.invalidateQueries();
        navigate({ to: "/admin/products" });
      }
    } catch (e) {
      reportError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_300px]" onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-5">
        <section className="card-surface space-y-4 p-5">
          <Field label="Product name *"><Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Basmati Rice" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category *">
              <Select value={v.categoryId} onValueChange={(x) => set("categoryId", x)}>
                <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                <SelectContent>
                  {cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Brand"><Input value={v.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Guard" /></Field>
            <Field label="Pack size / weight *"><Input value={v.packSize} onChange={(e) => set("packSize", e.target.value)} placeholder="e.g. 5 kg, 1 L, 12 pcs" /></Field>
            <Field label="SKU / code"><Input value={v.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
          </div>
          <Field label="Description"><Textarea rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field>
        </section>

        <section className="card-surface space-y-3 p-5">
          <h2 className="font-bold">Photos</h2>
          <div className="flex flex-wrap gap-3">
            {v.images.map((src, i) => (
              <div key={src + i} className="relative size-24 overflow-hidden rounded-lg border border-border bg-muted">
                <img src={src} alt="" className="size-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => set("images", v.images.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {v.images.length < 6 && (
              <label className="grid size-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <span className="grid place-items-center gap-1"><ImagePlus className="size-5" />Upload</span>}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <Input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="…or paste an image link (https://)" />
            <Button type="button" variant="outline" disabled={!imgUrl.startsWith("https://") || v.images.length >= 6}
              onClick={() => { set("images", [...v.images, imgUrl.trim()]); setImgUrl(""); }}>Add</Button>
          </div>
        </section>

        <section className="card-surface grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Selling price (Rs.) *"><Input inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="'Was' price (optional)"><Input inputMode="decimal" value={v.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} /></Field>
          <Field label="Purchase cost (private)"><Input inputMode="decimal" value={v.purchaseCost} onChange={(e) => set("purchaseCost", e.target.value)} /></Field>
          <Field label="Stock quantity *"><Input inputMode="numeric" value={v.stock} onChange={(e) => set("stock", e.target.value)} /></Field>
          <Field label="Max per order"><Input inputMode="numeric" value={v.maxPerOrder} onChange={(e) => set("maxPerOrder", e.target.value)} /></Field>
          <div className="self-end text-sm">
            {margin != null && (
              <span className={margin < 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                Margin: {formatPKR(margin)} {price ? `(${Math.round((margin / price) * 100)}%)` : ""}
              </span>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card-surface space-y-4 p-5">
          <Toggle label="Featured on homepage" checked={v.featured} onChange={(x) => set("featured", x)} />
          <Toggle label="Earns reward points" checked={v.pointsEligible} onChange={(x) => set("pointsEligible", x)} />
          <div className="space-y-2 border-t border-border pt-4">
            <Button type="button" className="w-full" disabled={saving} onClick={() => submit("active")}>
              {saving && <Loader2 className="size-4 animate-spin" />} Publish
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={saving} onClick={() => submit("draft")}>
              Save as draft
            </Button>
            <p className="text-xs text-muted-foreground">Drafts stay hidden from customers.</p>
          </div>
        </section>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-medium">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
