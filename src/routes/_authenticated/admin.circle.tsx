/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminTitle, Empty, fmtDate, report, reportError } from "@/components/admin/AdminBits";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminListCampaigns, adminSetCampaignStatus, adminSetParticipantStatus } from "@/lib/admin.functions";
import { formatPKR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/circle")({ component: Circle });

const CS = { collecting: "Collecting", goal_reached: "Goal reached", confirming_supplier: "Confirming supplier", confirmed: "Confirmed", failed: "Failed", cancelled: "Cancelled", completed: "Completed" } as const;
const PS = { reserved: "Reserved", confirmed: "Confirmed", fulfilled: "Fulfilled", released: "Released", cancelled: "Cancelled" } as const;

function Circle() {
  const listFn = useServerFn(adminListCampaigns);
  const campFn = useServerFn(adminSetCampaignStatus);
  const partFn = useServerFn(adminSetParticipantStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "circle"], queryFn: () => listFn() });
  const done = () => qc.invalidateQueries({ queryKey: ["admin", "circle"] });

  async function setCamp(id: string, status: keyof typeof CS) {
    if ((status === "failed" || status === "cancelled") && !confirm("This releases every reservation in this campaign. Continue?")) return;
    try { if (report(await campFn({ data: { id, status } }), "Campaign updated")) done(); } catch (e) { reportError(e); }
  }
  async function setPart(id: string, status: keyof typeof PS) {
    try { if (report(await partFn({ data: { id, status } }), "Reservation updated")) done(); } catch (e) { reportError(e); }
  }

  return (
    <>
      <AdminTitle title="Ration Circle" subtitle="Group-buy campaigns, progress towards the goal, and who has joined." />
      {isLoading ? <Empty>Loading…</Empty> : !data?.length ? <Empty>No campaigns yet.</Empty> : (
        <div className="space-y-5">
          {data.map((c) => {
            const pct = Math.min(100, Math.round((c.committed / Math.max(1, c.min_quantity)) * 100));
            return (
              <div key={c.id} className="card-surface space-y-3 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold">{c.title}</div>
                    <div className="text-muted-foreground">{c.product} · {formatPKR(Number(c.price))} · deadline {fmtDate(c.deadline)}</div>
                  </div>
                  <Select value={c.status} onValueChange={(v) => setCamp(c.id, v as keyof typeof CS)}>
                    <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs"><span>{c.committed} of {c.min_quantity} reserved</span><span>{pct}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                </div>
                {!c.participants.length ? <p className="text-muted-foreground">Nobody has joined yet.</p> : (
                  <div className="divide-y rounded-md border">
                    {c.participants.map((p: any) => (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                        <div>
                          <div className="font-semibold">{p.name} <Badge variant="secondary">×{p.quantity}</Badge></div>
                          <div className="text-xs text-muted-foreground">{p.phone ?? "No phone"}{p.zone ? ` · ${p.zone}` : ""} · joined {fmtDate(p.created_at)}</div>
                        </div>
                        <Select value={p.status} onValueChange={(v) => setPart(p.id, v as keyof typeof PS)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(PS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
