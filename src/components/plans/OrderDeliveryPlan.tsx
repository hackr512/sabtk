import { readPlanSnapshot } from '@/lib/delivery-plan';
import { formatPKR } from '@/lib/pricing';
export function OrderDeliveryPlan({ snapshot, selectedAt, creditStatus = "none", waived = 0, charged = 0, remaining = null, purchaseId = null }: { snapshot: unknown; selectedAt: string | null; creditStatus?: string; waived?: number; charged?: number; remaining?: number | null; purchaseId?: string | null }) {
  const p = readPlanSnapshot(snapshot);
  return <section className="space-y-3 border-y border-border py-5 text-sm"><h2 className="text-lg font-bold">Delivery Plan Information</h2>{!p ? <><p>Plan selected: No</p><p className="text-muted-foreground">Customer did not select a delivery plan.</p></> : <><dl className="grid gap-2 sm:grid-cols-2">
    <div><dt className="text-muted-foreground">Delivery plan used</dt><dd>{waived > 0 ? "Yes" : "No"} · {p.name}</dd></div>
    <div><dt className="text-muted-foreground">Delivery credit</dt><dd>{creditStatus}</dd></div>
    <div><dt className="text-muted-foreground">Delivery fee before waiver</dt><dd>{formatPKR(charged + waived)}</dd></div>
    <div><dt className="text-muted-foreground">Actual delivery fee</dt><dd>{formatPKR(charged)}</dd></div>
    <div><dt className="text-muted-foreground">Credits remaining after reservation</dt><dd>{remaining ?? "—"}</dd></div>
    <div><dt className="text-muted-foreground">Related plan purchase</dt><dd className="break-all text-xs">{purchaseId ?? "—"}</dd></div>
    <div><dt className="text-muted-foreground">Price at ordering</dt><dd>{formatPKR(p.price)}</dd></div>
    <div><dt className="text-muted-foreground">Delivery frequency</dt><dd>{p.credits} deliveries per {p.validityDays} days</dd></div>
    <div><dt className="text-muted-foreground">Plan duration</dt><dd>{p.validityDays} days after payment confirmation</dd></div>
    <div><dt className="text-muted-foreground">Plan ID</dt><dd className="break-all text-xs">{p.id}</dd></div>
    <div><dt className="text-muted-foreground">Selection date</dt><dd>{selectedAt ? new Date(selectedAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' }) : '—'}</dd></div>
  </dl><div><h3 className="font-semibold">Plan benefits</h3><ul className="mt-1 space-y-1 text-muted-foreground">{p.benefits.map(b => <li key={b}>{b}</li>)}<li>Minimum basket {formatPKR(p.minBasket)} · Carry forward up to {p.maxCarryForward} credits</li></ul></div></>}</section>;
}
