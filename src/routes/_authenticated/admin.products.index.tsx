import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MoreHorizontal, PackagePlus } from "lucide-react";
import { useState } from "react";
import { AdminTitle, Empty, report, reportError } from "@/components/admin/AdminBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminListProducts, adminProductAction, adminQuickUpdate } from "@/lib/admin.functions";
import { formatPKR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: Products,
});

type Status = "all" | "active" | "draft" | "archived";
type Action = "publish" | "unpublish" | "archive" | "restore" | "delete";

function Products() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const listFn = useServerFn(adminListProducts);
  const actionFn = useServerFn(adminProductAction);
  const quickFn = useServerFn(adminQuickUpdate);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", q, status],
    queryFn: () => listFn({ data: { q, status } }),
  });

  async function act(id: string, action: Action) {
    if (action === "delete" && !confirm("Delete this product? This can't be undone.")) return;
    try {
      if (report(await actionFn({ data: { id, action } }))) qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { reportError(e); }
  }

  async function quick(id: string, price: number, stock: number) {
    try {
      if (report(await quickFn({ data: { id, price, stock } }), "Updated")) qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { reportError(e); }
  }

  return (
    <>
      <AdminTitle
        title="Products"
        subtitle={`${data?.length ?? 0} shown`}
        action={<Button asChild><Link to="/admin/products/new"><PackagePlus className="size-4" /> Add product</Link></Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search name, brand or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={(x) => setStatus(x as Status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (not archived)</SelectItem>
            <SelectItem value="active">Live</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <Empty>Loading…</Empty> : !data?.length ? <Empty>No products found.</Empty> : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Product</th><th className="p-3">Status</th><th className="p-3">Price (Rs.)</th><th className="p-3">Stock</th><th className="p-3">Cost</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    <Link to="/admin/products/$id" params={{ id: p.id }} className="flex items-center gap-3">
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">{p.image && <img src={p.image} alt="" className="size-full object-cover" />}</div>
                      <div>
                        <div className="font-semibold hover:underline">{p.brand ? `${p.brand} ` : ""}{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.packSize} · {p.category}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="p-3">
                    <Badge variant={p.status === "active" ? "success" : p.status === "draft" ? "warning" : "muted"}>
                      {p.status === "active" ? "Live" : p.status === "draft" ? "Draft" : "Archived"}
                    </Badge>
                    {p.stock <= 5 && p.status === "active" && <Badge variant="destructive" className="ml-1">Low</Badge>}
                  </td>
                  <QuickCells key={`${p.id}-${p.price}-${p.stock}`} price={p.price} stock={p.stock} onSave={(pr, st) => quick(p.id, pr, st)} />
                  <td className="p-3 text-muted-foreground">{p.purchaseCost != null ? formatPKR(p.purchaseCost) : "—"}</td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Product actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to="/admin/products/$id" params={{ id: p.id }}>Edit</Link></DropdownMenuItem>
                        {p.status !== "active" && <DropdownMenuItem onClick={() => act(p.id, "publish")}>Publish</DropdownMenuItem>}
                        {p.status === "active" && <DropdownMenuItem onClick={() => act(p.id, "unpublish")}>Move to draft</DropdownMenuItem>}
                        {p.status !== "archived" ? <DropdownMenuItem onClick={() => act(p.id, "archive")}>Archive</DropdownMenuItem>
                          : <DropdownMenuItem onClick={() => act(p.id, "restore")}>Restore</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive" onClick={() => act(p.id, "delete")}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function QuickCells({ price, stock, onSave }: { price: number; stock: number; onSave: (p: number, s: number) => void }) {
  const [p, setP] = useState(String(price));
  const [s, setS] = useState(String(stock));
  const dirty = Number(p) !== price || Number(s) !== stock;
  return (
    <>
      <td className="p-3"><Input aria-label="Price" className="h-8 w-24" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} /></td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          <Input aria-label="Stock" className="h-8 w-20" inputMode="numeric" value={s} onChange={(e) => setS(e.target.value)} />
          {dirty && <Button size="sm" className="h-8" onClick={() => onSave(Number(p), Number(s))}>Save</Button>}
        </div>
      </td>
    </>
  );
}
