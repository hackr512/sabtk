import { z } from 'zod';
import { deliveryFeeFor } from './pricing';
import type { Product } from './types';

export const budgetInput = z.object({ budget: z.number().min(1).max(10000000), household: z.number().int().min(1).max(20), tier: z.enum(['basic', 'standard', 'premium']) });
export type BudgetInput = z.infer<typeof budgetInput>;
export type BudgetCategory = { id: string; name: string; priority: number; minimum_budget: number; enabled: boolean };
export type ConsumptionRule = { id: string; category_id: string; name: string; unit: string; household_base: number; per_person: number; min_packs: number; max_packs: number; essential: boolean; enabled: boolean; allow_substitution: boolean };
export type BudgetProduct = { product: Product; ruleId: string; tiers: string[]; enabled: boolean };
export type BudgetCatalog = { categories: BudgetCategory[]; rules: ConsumptionRule[]; products: BudgetProduct[] };
export type BudgetLine = { product: Product; quantity: number; ruleId: string };

export function packAmount(p: Product, unit: string) {
  if (!p.unit || !p.unitQuantity || p.unitQuantity <= 0) return 0;
  const from = p.unit.toLowerCase();
  const to = unit.toLowerCase();
  if (from === to) return p.unitQuantity;
  if ((from === 'g' && to === 'kg') || (from === 'ml' && to === 'l')) return p.unitQuantity / 1000;
  return 0;
}
export const basketSubtotal = (lines: BudgetLine[]) => Math.round(lines.reduce((s, l) => s + l.product.price * l.quantity, 0) * 100) / 100;
export const basketTotal = (lines: BudgetLine[]) => { const s = basketSubtotal(lines); return s ? s + deliveryFeeFor(s) : 0; };
export function eligibleProducts(catalog: BudgetCatalog, input: BudgetInput) {
  return catalog.products.filter(p => p.enabled && p.tiers.includes(input.tier) && p.product.stock > 0 && p.product.price > 0 && p.product.maxPerOrder > 0);
}
export function coverage(catalog: BudgetCatalog, input: BudgetInput, lines: BudgetLine[]) {
  return catalog.rules.filter(r => r.enabled && catalog.categories.some(c => c.id === r.category_id && c.enabled)).map(rule => {
    const target = rule.household_base + rule.per_person * input.household;
    const provided = lines.filter(l => l.ruleId === rule.id).reduce((s,l) => s + packAmount(l.product,rule.unit) * l.quantity, 0);
    return { rule, target, provided, complete: provided + 0.000001 >= target };
  });
}

/** Allocate minimum essentials first, then complete priority-weighted monthly needs. No prices or inventory are inferred. */
export function recommendBudget(catalog: BudgetCatalog, raw: BudgetInput) {
  const input = budgetInput.parse(raw);
  const eligible = eligibleProducts(catalog,input);
  const categories = catalog.categories.filter(c => c.enabled).sort((a,b) => a.priority-b.priority);
  const rules = catalog.rules.filter(r => r.enabled && categories.some(c => c.id === r.category_id)).sort((a,b) => {
    const ap = categories.find(c => c.id === a.category_id)?.priority ?? 100;
    const bp = categories.find(c => c.id === b.category_id)?.priority ?? 100;
    return Number(b.essential)-Number(a.essential) || ap-bp || a.id.localeCompare(b.id);
  });
  const lines: BudgetLine[] = [];
  const tryAdd = (rule: ConsumptionRule, minimum: boolean) => {
    const category = categories.find(c => c.id === rule.category_id);
    if (!category || input.budget < category.minimum_budget) return false;
    const target = rule.household_base + rule.per_person * input.household;
    const provided = lines.filter(l => l.ruleId === rule.id).reduce((s,l) => s + packAmount(l.product,rule.unit)*l.quantity,0);
    const existingPacks = lines.filter(l => l.ruleId === rule.id).reduce((s,l) => s+l.quantity,0);
    if (target <= 0 || provided >= target || existingPacks >= rule.max_packs) return false;
    const candidates = eligible.filter(p => p.ruleId === rule.id && packAmount(p.product,rule.unit) > 0).map(p => {
      const old = lines.find(l => l.product.id === p.product.id);
      const add = minimum ? Math.max(1,rule.min_packs-existingPacks) : 1;
      if ((old?.quantity ?? 0)+add > Math.min(p.product.stock,p.product.maxPerOrder) || existingPacks+add > rule.max_packs) return null;
      const next = old ? lines.map(l => l === old ? {...l,quantity:l.quantity+add}:l) : [...lines,{product:p.product,quantity:add,ruleId:rule.id}];
      if (basketTotal(next) > input.budget) return null;
      const useful = Math.min(target-provided,packAmount(p.product,rule.unit)*add);
      return {next,score:p.product.price*add/useful,id:p.product.id};
    }).filter((p): p is NonNullable<typeof p> => p !== null).sort((a,b) => a.score-b.score || a.id.localeCompare(b.id));
    const best = candidates[0];
    if (!best) return false;
    lines.splice(0,lines.length,...best.next);
    return true;
  };
  for (const rule of rules.filter(r => r.essential)) tryAdd(rule,true);
  for (const rule of rules) { if (!lines.some(l => l.ruleId===rule.id) && !tryAdd(rule,true)) continue; for(let i=0;i<rule.max_packs;i++) if(!tryAdd(rule,false)) break; }
  const total = basketTotal(lines);
  return { input, lines, total, remaining: Math.round((input.budget-total)*100)/100, coverage: coverage(catalog,input,lines) };
}