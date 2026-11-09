import type { Plan } from './membership.functions';
import type { OrderTotals } from './pricing';

export function addDeliveryPlan<T extends OrderTotals>(totals: T, planPrice = 0): T & { planPrice: number } {
  if (!Number.isFinite(planPrice) || planPrice < 0) throw new Error('Invalid delivery plan price');
  return { ...totals, planPrice, total: Math.round((totals.total + planPrice) * 100) / 100 };
}

export type PlanSnapshot = Pick<Plan, 'id' | 'name' | 'price' | 'credits' | 'validityDays' | 'benefits' | 'minBasket' | 'maxCarryForward' | 'zoneIds'>;
export function readPlanSnapshot(value: unknown): PlanSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (typeof p['id'] !== 'string' || typeof p['name'] !== 'string' || typeof p['price'] !== 'number' || typeof p['credits'] !== 'number' || typeof p['validityDays'] !== 'number') return null;
  return { id: p['id'], name: p['name'], price: p['price'], credits: p['credits'], validityDays: p['validityDays'], benefits: Array.isArray(p['benefits']) ? p['benefits'].filter((b): b is string => typeof b === 'string') : [], minBasket: Number(p['minBasket'] ?? 0), maxCarryForward: Number(p['maxCarryForward'] ?? 0), zoneIds: Array.isArray(p['zoneIds']) ? p['zoneIds'].filter((z): z is string => typeof z === 'string') : [] };
}
