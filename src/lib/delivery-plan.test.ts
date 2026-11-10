import { describe, it, expect } from 'vitest';
import { addDeliveryPlan, deliveryPlanTotals, readPlanSnapshot } from './delivery-plan';
import { computeTotals } from './pricing';
const groceries = computeTotals([{ unitPrice: 1000, quantity: 1, pointsEligible: true }]);
describe('optional delivery plan purchase', () => {
  it('without a plan preserves existing checkout totals', () => expect(addDeliveryPlan(groceries).total).toBe(1250));
  it('charges a selected plan once separately from delivery', () => {
    const t = addDeliveryPlan(groceries, 499);
    expect(t.total).toBe(1749); expect(t.deliveryFee).toBe(250); expect(t.subtotal).toBe(1000);
  });
  it('changing plan replaces the previous price', () => expect(addDeliveryPlan(groceries, 899).total).toBe(2149));
  it('removing plan restores normal total', () => expect(addDeliveryPlan(groceries, 0).total).toBe(1250));
  it('plan purchase does not earn grocery points or unlock free delivery', () => { const t = addDeliveryPlan(groceries, 1300); expect(t.deliveryFee).toBe(250); expect(t.pointsToEarn).toBe(10); });
  it('keeps the Rs. 250 delivery fee on larger groceries when buying a plan', () => { const t = addDeliveryPlan(computeTotals([{ unitPrice: 1500, quantity: 1, pointsEligible: true }]),499); expect(t.total).toBe(2249); expect(t.deliveryFee).toBe(250); });
  it('preserves grocery discounts rather than discounting the plan', () => { const t = addDeliveryPlan(computeTotals([{ unitPrice: 1000, quantity: 1, pointsEligible: true }], { discountType: 'percent', value: 10, minSubtotal: 0, maxDiscount: null }), 499); expect(t.total).toBe(1649); expect(t.discount).toBe(100); });
  it('existing orders without snapshots are supported', () => expect(readPlanSnapshot(null)).toBeNull());
  it('reads a price snapshot independently of current plan price', () => expect(readPlanSnapshot({ id: 'saved-id', name: 'Saved plan', price: 499, credits: 4, validityDays: 30 })?.price).toBe(499));
});
const basic = { id: 'basic', name: 'Basic', slug: 'basic', price: 799, credits: 4, validityDays: 30, benefits: [], description: null, minBasket: 0, maxCarryForward: 0, zoneIds: [], isRecommended: false };
describe('automatic delivery entitlement pricing', () => {
  const basket = computeTotals([{ unitPrice: 4200, quantity: 1, pointsEligible: true }]);
  it('without a plan charges Rs. 250', () => expect(deliveryPlanTotals(basket,null,null,null).deliveryFee).toBe(250));
  it('Basic with groceries includes first delivery and totals Rs. 4,999', () => { const t=deliveryPlanTotals(basket,basic,null,null); expect(t.total).toBe(4999); expect(t.deliveryFee).toBe(0); expect(t.deliveryFeeWaived).toBe(250); });
  it('paid available credit automatically covers delivery without repurchasing', () => { const t=deliveryPlanTotals(basket,null,{creditsAvailable:3,minBasket:0,zoneIds:[]},null); expect(t.total).toBe(4200); expect(t.planPrice).toBe(0); });
  it('exhausted credits restore the Rs. 250 fee', () => expect(deliveryPlanTotals(basket,null,{creditsAvailable:0,minBasket:0,zoneIds:[]},null).total).toBe(4450));
  it('inactive or expired benefit does not waive delivery', () => expect(deliveryPlanTotals(basket,null,null,null).total).toBe(4450));
  it('selected plans do not waive an ineligible service zone', () => expect(deliveryPlanTotals(basket,{...basic,zoneIds:['allowed']},null,'other').deliveryFee).toBe(250));
  it('plan fee does not earn loyalty points', () => expect(deliveryPlanTotals(basket,basic,null,null).pointsToEarn).toBe(42));
});
