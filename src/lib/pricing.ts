/**
 * Single source of truth for SabTk money rules. Used by product cards, cart,
 * checkout and the server-side order validation so they can never disagree.
 */

export const DELIVERY_FEE = 150;
export const FREE_DELIVERY_THRESHOLD = 1500;
export const RUPEES_PER_POINT = 100;
export const REFERRAL_POINTS = 30;
export const REFERRAL_MIN_ORDER = 1500;
export const MAX_DELIVERY_DAYS_AHEAD = 3;

export type PricingLine = {
  unitPrice: number;
  quantity: number;
  pointsEligible: boolean;
};

export type PromoRule = {
  discountType: "flat" | "percent";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  eligiblePointsSubtotal: number;
  pointsToEarn: number;
  amountToFreeDelivery: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Delivery fee is based on the item subtotal (before promo discounts; free reward items don't count). */
export function deliveryFeeFor(itemSubtotal: number): number {
  if (itemSubtotal <= 0) return 0;
  return itemSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function amountToFreeDelivery(itemSubtotal: number): number {
  return Math.max(0, round2(FREE_DELIVERY_THRESHOLD - itemSubtotal));
}

/** 1 point per Rs. 100 of eligible merchandise subtotal, rounded down. */
export function pointsForAmount(eligibleSubtotal: number): number {
  if (!Number.isFinite(eligibleSubtotal) || eligibleSubtotal <= 0) return 0;
  return Math.floor(eligibleSubtotal / RUPEES_PER_POINT);
}

export function promoDiscount(promo: PromoRule | null | undefined, subtotal: number): number {
  if (!promo || subtotal <= 0 || subtotal < promo.minSubtotal) return 0;
  let d = promo.discountType === "flat" ? promo.value : (subtotal * promo.value) / 100;
  if (promo.maxDiscount != null) d = Math.min(d, promo.maxDiscount);
  return round2(Math.min(d, subtotal));
}

export function computeTotals(lines: PricingLine[], promo?: PromoRule | null): OrderTotals {
  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const eligibleRaw = lines
    .filter((l) => l.pointsEligible)
    .reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discount = promoDiscount(promo, subtotal);
  const deliveryFee = deliveryFeeFor(subtotal);
  // Promo discounts reduce the points-eligible amount proportionally.
  const eligiblePointsSubtotal =
    subtotal > 0 ? round2(eligibleRaw * (1 - discount / subtotal)) : 0;
  return {
    subtotal,
    discount,
    deliveryFee,
    total: round2(subtotal - discount + deliveryFee),
    eligiblePointsSubtotal,
    pointsToEarn: pointsForAmount(eligiblePointsSubtotal),
    amountToFreeDelivery: amountToFreeDelivery(subtotal),
  };
}

export function formatPKR(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  const [int, dec] = Math.abs(rounded).toFixed(isWhole ? 0 : 2).split(".");
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${rounded < 0 ? "-" : ""}Rs. ${withCommas}${dec ? `.${dec}` : ""}`;
}

/** Human unit price, e.g. "Rs. 135 / kg" or "Rs. 60 / 100 g". Null when not meaningful. */
export function unitPriceLabel(
  price: number,
  unit: string | null,
  unitQuantity: number | null,
): string | null {
  if (!unit || !unitQuantity || unitQuantity <= 0) return null;
  if (unit === "kg" || unit === "L") {
    if (unitQuantity === 1) return null;
    return `${formatPKR(price / unitQuantity)} / ${unit}`;
  }
  if (unit === "g" || unit === "ml") {
    return `${formatPKR((price / unitQuantity) * 100)} / 100 ${unit}`;
  }
  if (unit === "pc" && unitQuantity > 1) {
    return `${formatPKR(price / unitQuantity)} / pc`;
  }
  return null;
}

/** Comparable price per base unit (kg, L, pc) used for "Best Value" ranking. */
export function pricePerBaseUnit(
  price: number,
  unit: string | null,
  unitQuantity: number | null,
): { base: string; value: number } | null {
  if (!unit || !unitQuantity || unitQuantity <= 0) return null;
  if (unit === "g") return { base: "kg", value: (price / unitQuantity) * 1000 };
  if (unit === "ml") return { base: "L", value: (price / unitQuantity) * 1000 };
  return { base: unit, value: price / unitQuantity };
}

/** Delivery dates offered at checkout: tomorrow up to MAX_DELIVERY_DAYS_AHEAD, in Pakistan time (UTC+5). */
export function deliveryDateOptions(now: Date = new Date()): string[] {
  const pk = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const base = Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate());
  const out: string[] = [];
  for (let i = 1; i <= MAX_DELIVERY_DAYS_AHEAD; i++) {
    out.push(new Date(base + i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

export function formatDeliveryDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
