import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const inventoryQuery = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!allowed) throw new Error("Forbidden");
  const [products, open, movements] = await Promise.all([
    context.supabase.from("products").select("id,name,sku,stock_quantity,low_stock_threshold,purchase_cost,price,updated_at,categories(name)").eq("is_archived", false).order("name"),
    context.supabase.from("orders").select("order_items(product_id,quantity)").in("status", ["pending_confirmation", "confirmed", "preparing", "ready_for_dispatch", "out_for_delivery"]),
    context.supabase.from("inventory_transactions").select("*,products(name)").order("created_at", { ascending: false }).limit(100),
  ]);
  if (products.error || open.error || movements.error) throw new Error("Could not load inventory");
  return { products: (products.data ?? []).map(p => ({ ...p, reserved: (open.data ?? []).reduce((sum,o) => sum + o.order_items.filter(i => i.product_id === p.id).reduce((n,i) => n+i.quantity,0),0) })), movements: movements.data ?? [] };
});
export const adjustStock = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id:z.string().uuid(), delta:z.number().int().min(-1000000).max(1000000), threshold:z.number().int().min(0).max(1000000), reason:z.string().trim().min(5).max(500) }).parse(d))
  .handler(async ({ data,context }) => {
    const { error } = await context.supabase.rpc("adjust_inventory", { p_product:data.id,p_delta:data.delta,p_threshold:data.threshold,p_reason:data.reason });
    if (error) throw new Error(error.message); return { ok:true };
  });
export const listReturns = createServerFn({ method:"GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d:unknown) => z.object({ orderId:z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({data,context}) => {
    let q=context.supabase.from("return_requests").select("*,orders(order_number,customer_name,phone),return_request_items(*,order_items(name,pack_size)),return_history(*)").order("created_at",{ascending:false}).limit(100);
    if(data.orderId) q=q.eq("order_id",data.orderId);
    const {data:rows,error}=await q; if(error) throw new Error("Could not load returns"); return rows ?? [];
  });
export const submitReturn = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
  .inputValidator((d:unknown)=>z.object({orderId:z.string().uuid(),scenario:z.enum(["full","partial","damaged","wrong","defective","replacement"]),description:z.string().trim().min(5).max(3000),items:z.array(z.object({itemId:z.string().uuid(),quantity:z.number().int().positive()})).min(1).max(100)}).parse(d))
  .handler(async({data,context})=>{ const {data:id,error}=await context.supabase.rpc("submit_return",{p_order:data.orderId,p_scenario:data.scenario,p_description:data.description,p_items:data.items}); if(error) throw new Error(error.message); return {id}; });
export const reviewReturn=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
  .inputValidator((d:unknown)=>z.object({id:z.string().uuid(),approve:z.boolean(),restore:z.boolean(),restock:z.boolean(),reason:z.string().trim().min(5).max(1000)}).parse(d))
  .handler(async({data,context})=>{const {error}=await context.supabase.rpc("review_return",{p_return:data.id,p_approve:data.approve,p_restore:data.restore,p_restock:data.restock,p_reason:data.reason});if(error)throw new Error(error.message);return {ok:true};});