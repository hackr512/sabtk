import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listReturns, submitReturn } from "@/lib/commerce.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPKR } from "@/lib/pricing";
export function OrderReturns({orderId,status,items}:{orderId:string;status:string;items:{id:string;name:string;quantity:number}[]}) {
 const get=useServerFn(listReturns),send=useServerFn(submitReturn),qc=useQueryClient();
 const {data:rows}=useQuery({queryKey:["returns",orderId],queryFn:()=>get({data:{orderId}})});
 const [scenario,setScenario]=useState<"full"|"partial"|"damaged"|"wrong"|"defective"|"replacement">("partial"),[description,setDescription]=useState(""),[qty,setQty]=useState<Record<string,number>>({}),[busy,setBusy]=useState(false);
 async function submit(){setBusy(true);try{await send({data:{orderId,scenario,description,items:items.filter(i=>(qty[i.id]??0)>0).map(i=>({itemId:i.id,quantity:qty[i.id]??0}))}});toast.success("Return request submitted");setDescription("");setQty({});await qc.invalidateQueries();}catch(e){toast.error(e instanceof Error?e.message:"Could not submit return");}finally{setBusy(false);}}
 return <section className="space-y-4 border-t border-border pt-5"><h2 className="font-bold">Returns & replacements</h2>{rows?.map(r=><div key={r.id} className="space-y-1 border-b border-border pb-3 text-sm"><b>{r.scenario} · {r.status}</b><p>{r.description}</p>{r.decision_reason&&<p>{r.decision_reason}</p>}<p className="text-muted-foreground">Delivery credit: {r.credit_decision} · Product refund: {formatPKR(Number(r.refund_amount))} · {r.refund_status.replaceAll("_"," ")}</p>{r.return_history.map(h=><p key={h.id} className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()} · {h.action}: {h.reason}</p>)}</div>)}{["delivered","return_requested"].includes(status)&&<><Select value={scenario} onValueChange={v=>setScenario(v as typeof scenario)}><SelectTrigger aria-label="Return reason"><SelectValue/></SelectTrigger><SelectContent>{["full","partial","damaged","wrong","defective","replacement"].map(s=><SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent></Select>{items.map(i=><div key={i.id} className="flex items-center justify-between gap-3"><Label htmlFor={`return-${i.id}`} className="text-sm">{i.name}</Label><Input id={`return-${i.id}`} type="number" min={0} max={i.quantity} className="w-20" value={qty[i.id]??0} onChange={e=>setQty(p=>({...p,[i.id]:Number(e.target.value)}))}/></div>)}<Textarea aria-label="Return description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the issue"/><Button onClick={submit} disabled={busy||description.trim().length<5||!Object.values(qty).some(n=>n>0)}>Submit return request</Button></>}</section>;
}