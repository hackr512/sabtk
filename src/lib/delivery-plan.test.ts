import { describe, it, expect } from 'vitest';
import { addDeliveryPlan, readPlanSnapshot } from './delivery-plan';
import { computeTotals } from './pricing';
const groceries = computeTotals([{ unitPrice: 1000, quantity: 1, pointsEligible: true }]);
describe('optional delivery plan purchase', () => {
  it('without a plan preserves existing checkout totals', () => expect(addDeliveryPlan(groceries).total).toBe(1150));
  it('charges a selected plan once separately from delivery', () => {
    const t = addDeliveryPlan(groceries, 499);
    expect(t.total).toBe(1649); expect(t.deliveryFee).toBe(150); expect(t.subtotal).toBe(1000);
  });
  it('changing plan replaces the previous price', () => expect(addDeliveryPlan(groceries, 899).total).toBe(2049));
  it('removing plan restores normal total', () => expect(addDeliveryPlan(groceries, 0).total).toBe(1150));
  it('plan purchase does not earn grocery points or unlock free delivery', () => { const t = addDeliveryPlan(groceries, 1300); expect(t.deliveryFee).toBe(150); expect(t.pointsToEarn).toBe(10); });
  it('keeps the Rs. 150 delivery fee on larger groceries when buying a plan', () => { const t = addDeliveryPlan(computeTotals([{ unitPrice: 1500, quantity: 1, pointsEligible: true }]),499); expect(t.total).toBe(2149); expect(t.deliveryFee).toBe(150); });
  it('preserves grocery discounts rather than discounting the plan', () => { const t = addDeliveryPlan(computeTotals([{ unitPrice: 1000, quantity: 1, pointsEligible: true }], { discountType: 'percent', value: 10, minSubtotal: 0, maxDiscount: null }), 499); expect(t.total).toBe(1549); expect(t.discount).toBe(100); });
  it('existing orders without snapshots are supported', () => expect(readPlanSnapshot(null)).toBeNull());
  it('reads a price snapshot independently of current plan price', () => expect(readPlanSnapshot({ id: 'saved-id', name: 'Saved plan', price: 499, credits: 4, validityDays: 30 })?.price).toBe(499));
});
