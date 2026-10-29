import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminTitle, Empty, fmtDate, report, reportError } from "@/components/admin/AdminBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminAdjustCredits, adminConfirmPayment, adminListSubscriptions, adminRejectPayment, adminSubscriptionAction,
} from "@/lib/admin.functions";
import { formatPKR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: Subscriptions,
});

type Data = Awaited<ReturnType<typeof adminListSubscriptions>>;
type Method = "cash" | "bank_transfer" | "easypaisa" | "jazzcash" | "card";
const METHODS: { v: Method; l: string }[] = [
  { v: "cash", l: "Cash" }, { v: "bank_transfer", l: "Bank transfer" }, { v: "easypaisa", l: "Easypaisa" },
  { v: "jazzcash", l: "JazzCash" }, { v: "card", l: "Card" },
];
const STATUS_LABEL: Record<string, string> = {
  active: "Active", pending_payment: "Waiting for payment", suspended: "Suspended", cancelled: "Cancelled", expired: "Expired",
};

function Subscriptions() {
  const fn = useServerFn(adminListSubscriptions);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "subs"], queryFn: () => fn() });
  const pending = data?.payments.filter((p) => p.status === "pending") ?? [];
  return (
    <>
      <AdminTitle title="Subscriptions" subtitle="Confirm plan payments by hand once you've received the money. A plan only starts after you confirm." />
      {isLoading ? <Empty>Loading…</Empty> : (
        <Tabs defaultValue="payments">
          <TabsList>
            <TabsTrigger value="payments">Payments to confirm ({pending.length})</TabsTrigger>
            <TabsTrigger value="members">Members ({data?.memberships.length ?? 0})</TabsTrigger>
            <TabsTrigger value="history">Payment history</TabsTrigger>
          </TabsList>
          <TabsContent value="payments" className="space-y-3">
            {!pending.length ? <Empty>No payments waiting.</Empty> : pending.map((p) => <PendingPayment key={p.id} p={p} />)}
          </TabsContent>
          <TabsContent value="members" className="space-y-3">
            {!data?.memberships.length ? <Empty>No subscriptions yet.</Empty> : data.memberships.map((m) => <Member key={m.id} m={m} />)}
          </TabsContent>
          <TabsContent value="history">
            {!data?.payments.length ? <Empty>No payments yet.</Empty> : (
              <div className="card-surface overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Method / ref</th><th className="p-3">Date</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3">{p.customer.name}<div className="text-xs text-muted-foreground">{p.customer.email}</div></td>
                        <td className="p-3">{p.plan} <span className="text-xs text-muted-foreground">({p.kind})</span></td>
                        <td className="p-3">{formatPKR(p.amount)}</td>
                        <td className="p-3"><Badge variant={p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "muted"}>{p.status}</Badge></td>
                        <td className="p-3 text-xs">{p.method ?? "—"} {p.reference ? `· ${p.reference}` : ""}{p.note ? <div className="text-muted-foreground">{p.note}</div> : null}</td>
                        <td className="p-3 text-xs">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["admin"] });
}

function PendingPayment({ p }: { p: Data["payments"][number] }) {
  const [method, setMethod] = useState<Method>("cash");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmFn = useServerFn(adminConfirmPayment);
  const rejectFn = useServerFn(adminRejectPayment);
  const refresh = useRefresh();

  async function run(kind: "confirm" | "reject") {
    if (kind === "reject" && !confirm("Mark this payment as not received?")) return;
    setBusy(true);
    try {
      const r = kind === "confirm"
        ? await confirmFn({ data: { paymentId: p.id, method, reference: ref } })
        : await rejectFn({ data: { paymentId: p.id } });
      if (report(r, kind === "confirm" ? "Payment confirmed — plan is active" : "Payment marked as not received")) refresh();
    } catch (e) { reportError(e); } finally { setBusy(false); }
  }

  return (
    <div className="card-surface flex flex-wrap items-end justify-between gap-3 p-4 text-sm">
      <div>
        <div className="font-bold">{p.customer.name} · {formatPKR(p.amount)}</div>
        <div className="text-muted-foreground">{p.plan} ({p.kind === "renewal" ? "renewal" : "new"}) · {p.customer.phone || p.customer.email} · requested {fmtDate(p.createdAt)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={method} onValueChange={(x) => setMethod(x as Method)}>
          <SelectTrigger className="h-9 w-36" aria-label="Payment method"><SelectValue /></SelectTrigger>
          <SelectContent>{METHODS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="h-9 w-40" placeholder="Reference (optional)" value={ref} onChange={(e) => setRef(e.target.value)} />
        <Button size="sm" disabled={busy} onClick={() => run("confirm")}>Confirm received</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run("reject")}>Not received</Button>
      </div>
    </div>
  );
}

function Member({ m }: { m: Data["memberships"][number] }) {
  const [delta, setDelta] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const actionFn = useServerFn(adminSubscriptionAction);
  const adjustFn = useServerFn(adminAdjustCredits);
  const refresh = useRefresh();

  async function action(a: "suspend" | "reactivate" | "cancel" | "cancel_at_period_end") {
    if ((a === "cancel" || a === "suspend") && !confirm(`${a === "cancel" ? "Cancel" : "Suspend"} this subscription?`)) return;
    setBusy(true);
    try { if (report(await actionFn({ data: { membershipId: m.id, action: a } }), "Subscription updated")) refresh(); }
    catch (e) { reportError(e); } finally { setBusy(false); }
  }
  async function adjust() {
    if (!m.cycleId) return;
    setBusy(true);
    try {
      if (report(await adjustFn({ data: { cycleId: m.cycleId, delta: Number(delta), note } }), "Credits adjusted")) { setNote(""); refresh(); }
    } catch (e) { reportError(e); } finally { setBusy(false); }
  }

  return (
    <div className="card-surface space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-bold">{m.customer.name} <Badge variant={m.status === "active" ? "loyalty" : m.status === "pending_payment" ? "warning" : "muted"}>{STATUS_LABEL[m.status] ?? m.status}</Badge></div>
          <div className="text-muted-foreground">{m.plan} · {m.customer.phone || m.customer.email}</div>
        </div>
        {m.status === "active" && (
          <div className="text-right">
            <div className="font-semibold">{m.available} of {m.granted} credits left</div>
            <div className="text-xs text-muted-foreground">{m.used} used · {m.held} held · {fmtDate(m.periodStart)} – {fmtDate(m.periodEnd)}</div>
            {m.cancelAtPeriodEnd && <div className="text-xs text-warning">Ends at period end</div>}
            {m.renewalScheduled && <div className="text-xs text-primary">Next month paid</div>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {m.status === "active" && <Button size="sm" variant="outline" disabled={busy} onClick={() => action("suspend")}>Suspend</Button>}
        {m.status === "suspended" && <Button size="sm" variant="outline" disabled={busy} onClick={() => action("reactivate")}>Reactivate</Button>}
        {m.status === "active" && !m.cancelAtPeriodEnd && <Button size="sm" variant="outline" disabled={busy} onClick={() => action("cancel_at_period_end")}>End at period end</Button>}
        {m.status !== "cancelled" && m.status !== "expired" && <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => action("cancel")}>Cancel now</Button>}
        {m.status === "active" && m.cycleId && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input className="h-9 w-20" inputMode="numeric" aria-label="Credits to add or remove" value={delta} onChange={(e) => setDelta(e.target.value)} />
            <Input className="h-9 w-48" placeholder="Reason (required)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" variant="secondary" disabled={busy || note.trim().length < 3 || !Number(delta)} onClick={adjust}>Adjust credits</Button>
          </div>
        )}
      </div>
    </div>
  );
}
