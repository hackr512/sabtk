import { describe, expect, it } from "vitest";
import {
  computeTotals,
  deliveryDateOptions,
  deliveryFeeFor,
  formatPKR,
  pointsForAmount,
  promoDiscount,
} from "./pricing";

describe("delivery fee policy", () => {
  it("charges Rs. 150 on orders below Rs. 1,500", () => {
    expect(deliveryFeeFor(1499)).toBe(150);
    expect(deliveryFeeFor(200)).toBe(150);
  });

  it("is free on orders of Rs. 1,500 or more", () => {
    expect(deliveryFeeFor(1500)).toBe(0);
    expect(deliveryFeeFor(4200)).toBe(0);
  });

  it("adds the fee into the final total", () => {
    const t = computeTotals([{ unitPrice: 600, quantity: 2, pointsEligible: true }]);
    expect(t.subtotal).toBe(1200);
    expect(t.deliveryFee).toBe(150);
    expect(t.total).toBe(1350);
    expect(t.amountToFreeDelivery).toBe(300);
  });
});

describe("loyalty points", () => {
  it("earns 1 point per Rs. 100 of eligible subtotal, rounded down", () => {
    expect(pointsForAmount(1499)).toBe(14);
    expect(pointsForAmount(100)).toBe(1);
    expect(pointsForAmount(99)).toBe(0);
  });

  it("does not earn points on ineligible items", () => {
    const t = computeTotals([
      { unitPrice: 1000, quantity: 1, pointsEligible: true },
      { unitPrice: 900, quantity: 1, pointsEligible: false },
    ]);
    expect(t.pointsToEarn).toBe(10);
  });
});

describe("promo codes", () => {
  it("never discounts more than the cap or below the minimum spend", () => {
    const promo = { discountType: "percent" as const, value: 10, minSubtotal: 2000, maxDiscount: 150 };
    expect(promoDiscount(promo, 1999)).toBe(0);
    expect(promoDiscount(promo, 3000)).toBe(150);
  });
});

describe("delivery dates", () => {
  it("offers the next three days in Pakistan time, never today", () => {
    // 20:00 UTC on 25 Oct = 01:00 on 26 Oct in Karachi
    expect(deliveryDateOptions(new Date("2026-10-25T20:00:00Z"))).toEqual([
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
    ]);
  });
});

describe("currency", () => {
  it("formats rupees with thousands separators", () => {
    expect(formatPKR(1500)).toBe("Rs. 1,500");
    expect(formatPKR(150)).toBe("Rs. 150");
  });
});
