import { queryOptions, useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, Check, Calculator, Loader2, Plus, ShoppingBag, Trash2, Users, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { QuantityStepper } from '@/components/shop/QuantityStepper';
import { PageHeader } from '@/components/site/Blocks';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { supabase } from '@/integrations/supabase/client';
import { getBudgetCatalog, generateBudget, validateBudgetBasket } from '@/lib/budget.functions';
import { basketSubtotal, basketTotal, coverage, eligibleProducts, type BudgetInput, type BudgetLine } from '@/lib/budget-engine';
import { deliveryFeeFor, formatPKR } from '@/lib/pricing';
import { pageHead } from '@/lib/seo';
import { cn } from '@/lib/utils';

const catalogQuery = queryOptions({queryKey:['budget-catalog'],queryFn:() => getBudgetCatalog()});
export const Route = createFileRoute('/budget')({
  head:() => pageHead('GharBudget — Monthly Grocery Planner','Build a monthly grocery basket for your household, budget and preferred product quality with SabTk GharBudget.'),
  loader:({context}) => context.queryClient.ensureQueryData(catalogQuery),
  component:Budget,
});
const TIERS = [
  {id:'basic',name:'Basic',quality:'Good Quality Products',description:'Affordable and economical brands',note:'Best for budget-conscious customers.'},
  {id:'standard',name:'Standard',quality:'Better Quality Products',description:'Established and recognized brands',note:'A balance between quality and price.'},
  {id:'premium',name:'Premium',quality:'Excellent Quality Products',description:'Premium and well-known brands',note:'For customers who prefer higher-quality products.'},
] as const;
const monthStart = () => {const d = new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;};
function Budget(){
  const {data:catalog} = useSuspenseQuery(catalogQuery);
  const {user} = useAuth(); const cart = useCart(); const qc=useQueryClient();
  const generate = useServerFn(generateBudget); const validate = useServerFn(validateBudgetBasket);
  const [input,setInput] = useState<BudgetInput>({budget:20000,household:4,tier:'standard'});
  const [lines,setLines] = useState<BudgetLine[] | null>(null);
  const [generatedFor,setGeneratedFor] = useState<BudgetInput | null>(null);
  const [busy,setBusy] = useState(false); const [adding,setAdding]=useState(false); const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [addId,setAddId]=useState('');
  const [restored,setRestored]=useState(false);
  useEffect(() => {try {const raw=localStorage.getItem('sabtk-gharbudget');if(raw){const d=JSON.parse(raw);if(d.input && Array.isArray(d.items)){setInput(d.input);setGeneratedFor(d.input);setLines(d.items.flatMap((i:{productId:string;quantity:number})=>{const p=catalog.products.find(p=>p.product.id===i.productId);return p && i.quantity>0 ? [{product:p.product,ruleId:p.ruleId,quantity:i.quantity}]:[];}));}}}catch{/* ignore corrupt draft */}setRestored(true);},[catalog]);
  useEffect(()=>{if(restored && lines) localStorage.setItem('sabtk-gharbudget',JSON.stringify({input,items:lines.map(l=>({productId:l.product.id,quantity:l.quantity}))}));},[input,lines,restored]);
  const {data:saved} = useQuery({queryKey:['budget',user?.id],enabled:!!user,queryFn:async()=>{const {data,error}=await supabase.from('budget_plans').select('id,budget_amount,household_size,quality_tier,budget_plan_items(product_id,quantity)').eq('user_id',user?.id ?? '').eq('month',monthStart()).maybeSingle();if(error) throw error;return data;}});
  const update=(patch:Partial<BudgetInput>)=>{setInput(old=>({...old,...patch}));setError('');};
  const run=async()=>{setBusy(true);setError('');try{const r=await generate({data:input});setLines(r.lines);setGeneratedFor(r.input);}catch(e){setError(e instanceof Error?e.message:'Could not generate your list');}finally{setBusy(false);}};
  const chosen=lines ?? []; const total=basketTotal(chosen); const subtotal=basketSubtotal(chosen); const over=total>input.budget;
  const stale=!!generatedFor && (input.household!==generatedFor.household || input.tier!==generatedFor.tier || input.budget!==generatedFor.budget);
  const statuses=coverage(catalog,input,chosen); const missing=statuses.filter(s=>s.rule.essential&&!s.complete);
  const eligible=eligibleProducts(catalog,input); const addable=eligible.filter(p=>!chosen.some(l=>l.product.id===p.product.id) && catalog.rules.some(r=>r.id===p.ruleId&&r.enabled));
  const topUp = missing.flatMap(s=>{
    const options=eligible.filter(p=>p.ruleId===s.rule.id).map(p=>{
      const quantity=(chosen.find(l=>l.product.id===p.product.id)?.quantity??0)+1;
      if(quantity>Math.min(p.product.stock,p.product.maxPerOrder))return null;
      const next=chosen.some(l=>l.product.id===p.product.id)?chosen.map(l=>l.product.id===p.product.id?{...l,quantity}:l):[...chosen,{product:p.product,quantity:1,ruleId:p.ruleId}];
      return {name:s.rule.name,extra:Math.max(0,basketTotal(next)-input.budget)};
    }).filter((p):p is NonNullable<typeof p>=>p!==null).sort((a,b)=>a.extra-b.extra);
    return options[0]?[options[0]]:[];
  }).filter(p=>p.extra>0).sort((a,b)=>a.extra-b.extra)[0];
  const setQuantity=(id:string,n:number)=>setLines(old=>(old??[]).flatMap(l=>l.product.id===id ? n>0?[{...l,quantity:n}]:[]:[l]));
  const save=async()=>{if(!user)return;setSaving(true);try{const {data:p,error}=await supabase.from('budget_plans').upsert({user_id:user.id,month:monthStart(),budget_amount:input.budget,household_size:input.household,quality_tier:input.tier},{onConflict:'user_id,month'}).select('id').single();if(error)throw error;const deleted=await supabase.from('budget_plan_items').delete().eq('plan_id',p.id);if(deleted.error)throw deleted.error;if(chosen.length){const r=await supabase.from('budget_plan_items').insert(chosen.map(l=>({plan_id:p.id,product_id:l.product.id,quantity:l.quantity})));if(r.error)throw r.error;}toast.success('Monthly budget saved');qc.invalidateQueries({queryKey:['budget']});}catch{toast.error('Could not save your budget');}finally{setSaving(false);}};
  return <>
    <PageHeader eyebrow="GharBudget" title="Your Budget. Your Family. Your Monthly Grocery Plan." subtitle="Tell us your budget, family size and preferred quality. SABTK will build a smart monthly grocery list for your home." />
    <div className="container-page py-8">
      <section className="border-b border-border pb-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div><Label htmlFor="monthly-budget" className="flex items-center gap-2 text-base"><Wallet className="size-5 text-primary"/> What's your monthly grocery budget?</Label><div className="mt-3 flex items-center gap-3"><span className="text-muted-foreground">PKR</span><Input id="monthly-budget" type="number" min={1} max={10000000} value={input.budget} onChange={e=>update({budget:Number(e.target.value)})} className="max-w-64 text-lg"/></div><div className="mt-3 flex flex-wrap gap-2">{[10000,15000,20000,25000,30000].map(n=><Button key={n} size="sm" variant={input.budget===n?'secondary':'outline'} onClick={()=>update({budget:n})}>{formatPKR(n)}</Button>)}</div></div>
          <div><Label htmlFor="household" className="flex items-center gap-2 text-base"><Users className="size-5 text-primary"/> How many people are in your home?</Label><select id="household" value={Math.min(input.household,7)} onChange={e=>update({household:Number(e.target.value)})} className="mt-3 h-11 w-full rounded-lg border border-input bg-background px-3">{[1,2,3,4,5,6,7].map(n=><option value={n} key={n}>{n===7?'7+ people':`${n} ${n===1?'person':'people'}`}</option>)}</select>{input.household>=7&&<div className="mt-3"><Label htmlFor="exact-household">Exact household size</Label><Input id="exact-household" type="number" min={7} max={20} value={input.household} onChange={e=>update({household:Number(e.target.value)})}/></div>}</div>
        </div>
        <fieldset className="mt-7"><legend className="mb-3 text-base font-semibold">What quality of products do you prefer?</legend><div className="grid gap-3 md:grid-cols-3">{TIERS.map(t=><label key={t.id} className={cn('relative cursor-pointer rounded-lg border p-5 transition-colors',input.tier===t.id?'border-primary bg-secondary':'border-border bg-card hover:border-primary/50')}><input className="sr-only" type="radio" name="quality" value={t.id} checked={input.tier===t.id} onChange={()=>update({tier:t.id})}/><span className="flex items-center justify-between text-xl font-semibold">{t.name}<span className={cn('grid size-5 place-items-center rounded-full border',input.tier===t.id?'border-primary bg-primary text-primary-foreground':'border-muted-foreground')}>{input.tier===t.id&&<Check className="size-3"/>}</span></span><p className="mt-3 text-sm font-semibold">{t.quality}</p><p className="mt-1 text-sm text-muted-foreground">{t.description}</p><p className="mt-3 text-xs text-muted-foreground">{t.note}</p></label>)}</div></fieldset>
        <div className="mt-6 flex flex-wrap items-center gap-3"><Button size="lg" onClick={run} disabled={busy}>{busy?<Loader2 className="size-4 animate-spin"/>:<Calculator className="size-4"/>}{busy?'Building your list…':'Generate My Monthly Grocery List'}<ArrowRight className="size-4"/></Button>{saved&&<Button variant="ghost" onClick={()=>{const i:BudgetInput={budget:Number(saved.budget_amount),household:saved.household_size,tier:saved.quality_tier as BudgetInput['tier']};setInput(i);setGeneratedFor(i);setLines((saved.budget_plan_items??[]).flatMap(l=>{const p=catalog.products.find(p=>p.product.id===l.product_id);return p?[{product:p.product,ruleId:p.ruleId,quantity:l.quantity}]:[];}));}}>Load saved month</Button>}</div>
        {error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </section>
      {lines!==null&&<div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0"><h2 className="text-2xl font-semibold">Your monthly grocery list</h2><p className="mt-2 text-sm text-muted-foreground">Your monthly grocery list is ready! We selected essential products according to your household size, budget and quality preference.</p>
          {stale&&<div className="mt-4 border-l-2 border-warning bg-muted p-3 text-sm">Your preferences changed. Generate again to recalculate; your edited list has not been changed.</div>}
          <div className="mt-6 divide-y divide-border">{chosen.map(l=>{const rule=catalog.rules.find(r=>r.id===l.ruleId);const alternatives=rule?.allow_substitution?eligible.filter(p=>p.ruleId===l.ruleId&&p.product.id!==l.product.id&&!chosen.some(l=>l.product.id===p.product.id)):[];return <article key={l.product.id} className="py-5"><div className="flex items-start gap-3">{l.product.image?<img src={l.product.image} alt={l.product.name} className="size-16 shrink-0 rounded-lg bg-muted object-contain"/>:<ShoppingBag className="size-12 text-muted-foreground"/>}<div className="min-w-0 flex-1"><h3 className="font-semibold">{l.product.name}</h3><p className="text-xs text-muted-foreground">{l.product.brand??'Unbranded'} · {l.product.packSize}</p><p className="mt-1 text-sm">{formatPKR(l.product.price)} each</p></div><Button size="icon" variant="ghost" aria-label={`Remove ${l.product.name}`} onClick={()=>setQuantity(l.product.id,0)}><Trash2 className="size-4"/></Button></div><div className="mt-3 flex items-center justify-between gap-3"><QuantityStepper size="sm" label={`Quantity of ${l.product.name}`} value={l.quantity} max={Math.min(l.product.stock,l.product.maxPerOrder)} onChange={n=>setQuantity(l.product.id,n)}/><span className="font-semibold tabular-nums">{formatPKR(l.product.price*l.quantity)}</span></div>{alternatives.length>0&&<select aria-label={`Replace ${l.product.name}`} value="" className="mt-3 w-full rounded-lg border border-input bg-background p-2 text-sm" onChange={e=>{const p=alternatives.find(p=>p.product.id===e.target.value);if(p)setLines(old=>(old??[]).map(old=>old.product.id===l.product.id?{product:p.product,ruleId:p.ruleId,quantity:1}:old));}}><option value="">Change brand / pack (replacement starts at 1 pack)</option>{alternatives.map(p=><option key={p.product.id} value={p.product.id}>{p.product.brand??'Unbranded'} · {p.product.packSize} · {formatPKR(p.product.price)}{l.product.price*l.quantity>p.product.price?` — save ${formatPKR(l.product.price*l.quantity-p.product.price)}`:''}</option>)}</select>}</article>;})}</div>
          {!chosen.length&&<p className="py-6 text-muted-foreground">No available packs fit this budget. Increase your budget or choose another quality.</p>}
          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-5"><div className="min-w-0 flex-1"><Label htmlFor="extra-product">Add additional products</Label><select id="extra-product" value={addId} onChange={e=>setAddId(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"><option value="">Choose a product in your quality tier</option>{addable.map(p=><option key={p.product.id} value={p.product.id}>{p.product.name} · {p.product.packSize} · {formatPKR(p.product.price)}</option>)}</select></div><Button variant="outline" disabled={!addId} onClick={()=>{const p=addable.find(p=>p.product.id===addId);if(p)setLines(old=>[...(old??[]),{product:p.product,quantity:1,ruleId:p.ruleId}]);setAddId('');}}><Plus className="size-4"/>Add</Button></div>
        </section>
        <aside className="h-fit space-y-6 lg:sticky lg:top-40"><div className="border-b border-border pb-6"><div className="text-xs font-semibold uppercase text-muted-foreground">Monthly plan · {input.household} people · {input.tier}</div><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Monthly budget</dt><dd>{formatPKR(input.budget)}</dd></div><div className="flex justify-between"><dt>Groceries</dt><dd>{formatPKR(subtotal)}</dd></div><div className="flex justify-between"><dt>Delivery</dt><dd>{subtotal?formatPKR(deliveryFeeFor(subtotal)):formatPKR(0)}</dd></div><div className="flex justify-between text-lg font-semibold"><dt>Basket total</dt><dd>{formatPKR(total)}</dd></div></dl><Progress value={Math.min(100,input.budget>0?total/input.budget*100:100)} className={cn('mt-4',over&&'[&>div]:bg-destructive')}/><p role="status" className={cn('mt-3 text-sm font-semibold',over?'text-destructive':'text-primary')}>{over?`You have exceeded your monthly budget by ${formatPKR(total-input.budget)}.`:`Remaining budget: ${formatPKR(input.budget-total)}`}</p>{over?<Button className="mt-3" variant="outline" onClick={()=>{update({budget:total});setGeneratedFor(old=>old?{...old,budget:total}:old);}}>Increase budget to {formatPKR(total)}</Button>:<p className="mt-2 text-xs text-muted-foreground">Your basket is within your monthly budget.</p>}</div>
          <div><h3 className="font-semibold">Monthly essentials coverage</h3><p className="mt-2 text-xs text-muted-foreground">Estimates, not a guarantee of dietary needs.</p>{missing.length>0&&<p className="mt-3 text-sm text-warning">This is not a complete monthly basket. Budget, availability or pack limits leave {missing.length} essentials short.</p>}{topUp&&<p className="mt-3 text-xs text-muted-foreground">Add {formatPKR(topUp.extra)} to your budget to include one more available pack of {topUp.name}.</p>}<ul className="mt-3 space-y-2 text-xs">{missing.map(s=>{const cat=catalog.categories.find(c=>c.id===s.rule.category_id);return <li key={s.rule.id} className="border-l border-border pl-3"><span className="font-medium">{s.rule.name}</span> · {cat?.name}<div className="text-muted-foreground">{Number(s.provided.toFixed(2))} / {Number(s.target.toFixed(2))} {s.rule.unit}{!eligible.some(p=>p.ruleId===s.rule.id)?' · unavailable in this tier':''}</div></li>;})}</ul>{!missing.length&&<p className="mt-3 text-sm text-primary">All configured essential consumption estimates are covered.</p>}</div>
          <Button className="w-full" disabled={!chosen.length||over||adding||stale} onClick={async()=>{setAdding(true);try{const fresh=await validate({data:{budget:input.budget,items:chosen.map(l=>({productId:l.product.id,quantity:l.quantity}))}});if(fresh.some(l=>cart.quantityOf(l.product.id)+l.quantity>Math.min(l.product.stock,l.product.maxPerOrder)))throw new Error('Your cart already contains some items near their quantity limit. Adjust the cart first.');cart.addMany(fresh);toast.success('Monthly list added to your cart');}catch(e){setError(e instanceof Error?e.message:'Could not add list');}finally{setAdding(false);}}}><ShoppingBag className="size-4"/>{adding?'Checking prices…':'Add list to cart'}</Button><Button asChild variant="outline" className="w-full"><Link to="/cart">View cart<ArrowRight className="size-4"/></Link></Button>{user?<Button variant="ghost" className="w-full" disabled={saving||over} onClick={save}>{saving?'Saving…':"Save this month's budget"}</Button>:<p className="text-xs text-muted-foreground"><Link to="/auth" className="text-primary underline">Sign in</Link> to save your monthly plan.</p>}
        </aside>
      </div>}
    </div>
  </>;
}
