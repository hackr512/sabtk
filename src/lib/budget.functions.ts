import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { createPublicClient } from './public-client.server';
import { PRODUCT_COLUMNS, mapProduct } from './mappers';
import { budgetInput, recommendBudget, type BudgetCatalog } from './budget-engine';

async function loadBudgetCatalog(db: ReturnType<typeof createPublicClient>): Promise<BudgetCatalog> {
  const [cats,rules,mappings,products] = await Promise.all([
    db.from('budget_categories').select('*').order('priority'),
    db.from('budget_consumption_rules').select('*').order('name'),
    db.from('budget_product_rules').select('*'),
    db.from('products').select(PRODUCT_COLUMNS).eq('is_active',true).eq('is_archived',false).order('name').limit(1000),
  ]);
  if (cats.error || rules.error || mappings.error || products.error) throw new Error('Could not load grocery planning settings. Please try again.');
  const mapped = new Map((mappings.data ?? []).map(m => [m.product_id,m]));
  return { categories:(cats.data ?? []).map(c => ({...c,minimum_budget:Number(c.minimum_budget)})), rules:(rules.data ?? []).map(r => ({...r,household_base:Number(r.household_base),per_person:Number(r.per_person)})), products:(products.data ?? []).map(row => {
    const m = mapped.get(row.id);
    return {product:mapProduct(row),ruleId:m?.rule_id ?? '',tiers:m?.quality_tiers ?? [],enabled:m?.enabled ?? false};
  }) };
}
export const getBudgetCatalog = createServerFn({method:'GET'}).handler(() => loadBudgetCatalog(createPublicClient()));
export const generateBudget = createServerFn({method:'POST'}).inputValidator((d:unknown) => budgetInput.parse(d)).handler(async ({data}) => recommendBudget(await loadBudgetCatalog(createPublicClient()),data));
export const validateBudgetBasket = createServerFn({method:'POST'}).inputValidator((d:unknown) => z.object({ budget:z.number().positive().max(10000000),items:z.array(z.object({productId:z.string().uuid(),quantity:z.number().int().min(1).max(100)})).min(1).max(100) }).parse(d)).handler(async ({data}) => {
  const catalog = await loadBudgetCatalog(createPublicClient());
  const seen = new Set<string>();
  const lines = data.items.map(i => {
    const p = catalog.products.find(p => p.product.id === i.productId);
    if (!p || seen.has(i.productId) || i.quantity > Math.min(p.product.stock,p.product.maxPerOrder)) throw new Error('An item is no longer available in that quantity. Please generate a fresh list.');
    seen.add(i.productId);
    return {product:p.product,quantity:i.quantity,ruleId:p.ruleId};
  });
  const {basketTotal} = await import('./budget-engine');
  if (basketTotal(lines) > data.budget) throw new Error('Current prices exceed your budget. Increase your budget or reduce the basket.');
  return lines;
});

const categorySchema = z.object({id:z.string().min(1).max(60),name:z.string().min(1).max(100),priority:z.number().int().min(1).max(100),minimum_budget:z.number().min(0).max(10000000),enabled:z.boolean()});
const ruleSchema = z.object({id:z.string().min(1).max(60),category_id:z.string().min(1),name:z.string().min(1).max(100),unit:z.enum(['kg','L','pc']),household_base:z.number().min(0).max(1000),per_person:z.number().min(0).max(1000),min_packs:z.number().int().min(1).max(100),max_packs:z.number().int().min(1).max(100),essential:z.boolean(),enabled:z.boolean(),allow_substitution:z.boolean()}).refine(r => r.max_packs>=r.min_packs,'Maximum must be at least the minimum');
export const adminBudgetData = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const role = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(role.error || !role.data) throw new Error('Admin access only');
  return loadBudgetCatalog(context.supabase);
});
export const adminSaveBudget = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown) => z.discriminatedUnion('kind',[
  z.object({kind:z.literal('category'),row:categorySchema}),
  z.object({kind:z.literal('rule'),row:ruleSchema}),
  z.object({kind:z.literal('product'),row:z.object({product_id:z.string().uuid(),rule_id:z.string().min(1),quality_tiers:z.array(z.enum(['basic','standard','premium'])).min(1).max(3),enabled:z.boolean()})}),
]).parse(d)).handler(async ({context,data}) => {
  const role = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(role.error || !role.data) throw new Error('Admin access only');
  const result = data.kind==='category' ? await context.supabase.from('budget_categories').upsert(data.row) : data.kind==='rule' ? await context.supabase.from('budget_consumption_rules').upsert(data.row) : await context.supabase.from('budget_product_rules').upsert(data.row);
  if(result.error) throw new Error('Could not save planning settings');
  return {ok:true};
});