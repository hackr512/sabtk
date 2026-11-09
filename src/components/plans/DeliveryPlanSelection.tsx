import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Check, Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { getPlans } from '@/lib/membership.functions';
import { formatPKR } from '@/lib/pricing';
import { cn } from '@/lib/utils';

export const deliveryPlansQuery = { queryKey: ['plans'], queryFn: () => getPlans(), staleTime: 0 };

export function DeliveryPlanSelection() {
  const cart = useCart();
  const { data, isPending, error, refetch } = useQuery(deliveryPlansQuery);
  const selected = cart.selectedPlan;
  useEffect(() => {
    if (!data || !cart.ready || !selected) return;
    const fresh = data.enabled ? data.plans.find(p => p.id === selected.id) : undefined;
    if (!fresh) cart.selectPlan(null);
    else if (JSON.stringify(fresh) !== JSON.stringify(selected)) cart.selectPlan(fresh);
  }, [data, cart.ready, selected, cart.selectPlan]);
  return <section className="space-y-4 border-t border-border py-6" aria-label="Choose Your Delivery Plan">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-xl font-bold"><Truck className="size-5 text-primary" />Choose Your Delivery Plan</h2><p className="mt-1 text-sm text-muted-foreground">Optional · Pay with your groceries on delivery. Credits start after payment confirmation.</p></div>
      {selected && <Button type="button" variant="ghost" size="sm" onClick={() => cart.selectPlan(null)}><X className="size-4" />Remove plan</Button>}
    </div>
    {isPending && <p className="text-sm text-muted-foreground">Loading delivery plans…</p>}
    {error && <div role="alert" className="text-sm text-destructive">Delivery plans could not load. <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Try again</Button></div>}
    {data && !data.enabled && <p className="text-sm text-muted-foreground">New delivery plan purchases are paused.</p>}
    {data?.enabled && data.plans.length === 0 && <p className="text-sm text-muted-foreground">No delivery plans are currently available.</p>}
    {data?.enabled && <div className="grid gap-3 xl:grid-cols-3">{data.plans.map(p => {
      const active = selected?.id === p.id;
      return <article key={p.id} className={cn('flex min-w-0 flex-col rounded-lg border bg-card p-4', active ? 'border-primary ring-1 ring-primary' : 'border-border')}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{p.name}</h3>{active && <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Check className="size-3" />Selected</span>}</div>
        <p className="mt-3 text-2xl font-bold">{formatPKR(p.price)}</p>
        <p className="mt-1 text-sm font-semibold text-primary">{p.credits} deliveries / {p.validityDays} days</p>
        <details className="my-3 flex-1 text-sm"><summary className="cursor-pointer font-medium">Plan details</summary><div className="mt-2 space-y-2 text-muted-foreground">{p.description && <p>{p.description}</p>}<ul className="space-y-1">{p.benefits.map(b => <li key={b}>{b}</li>)}<li>Minimum grocery basket: {formatPKR(p.minBasket)}</li><li>{p.maxCarryForward} credits may carry forward</li><li>{p.zoneIds.length ? 'Valid in selected service areas' : 'Valid in all service areas'}</li><li>One credit per eligible delivery; already-free deliveries do not use credits.</li></ul></div></details>
        <Button type="button" variant={active ? 'secondary' : 'outline'} aria-pressed={active} disabled={active || !cart.ready} onClick={() => cart.selectPlan(p)}>{active ? <><Check className="size-4" />Selected</> : `Select ${p.name}`}</Button>
      </article>;
    })}</div>}
    <p className="text-xs text-muted-foreground">No automatic recurring payments. This purchase does not waive today’s delivery fee; existing active credits remain available.</p>
  </section>;
}

export function SelectedDeliveryPlan() {
  const cart = useCart();
  const p = cart.selectedPlan;
  if (!p) return null;
  return <div className="flex items-start justify-between gap-3 rounded-lg border border-primary bg-primary-soft p-3 text-sm" aria-label="Selected delivery plan">
    <div className="min-w-0"><p className="font-bold">Delivery plan · {p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.credits} deliveries · {p.validityDays} days · Payment confirmation required</p></div>
    <div className="shrink-0 text-right"><p className="font-bold">{formatPKR(p.price)}</p><Button type="button" size="icon" variant="ghost" className="mt-1 size-7" aria-label="Remove selected delivery plan" title="Remove plan" onClick={() => cart.selectPlan(null)}><X className="size-4" /></Button></div>
  </div>;
}
