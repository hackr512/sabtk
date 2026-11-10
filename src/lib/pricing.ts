/**
 * Single source of truth for SabTk money rules. Used by product cards, cart,
 * checkout and the server-side order validation so they can never disagree.
 */

export const DELIVERY_FEE = 250;
export function configuredDeliveryFee(value?: string | null): number {
  if (!value?.trim()) return DELIVERY_FEE;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n * 100) / 100 : DELIVERY_FEE;
}
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
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Every nonempty grocery subtotal pays the regular fee, unless a paid plan credit covers it. */
export function deliveryFeeFor(itemSubtotal: number, fee = DELIVERY_FEE): number {
  if (itemSubtotal <= 0) return 0;
  return fee;
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

export function computeTotals(lines: PricingLine[], promo?: PromoRule | null, fee = DELIVERY_FEE): OrderTotals {
  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const eligibleRaw = lines
    .filter((l) => l.pointsEligible)
    .reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discount = promoDiscount(promo, subtotal);
  const deliveryFee = deliveryFeeFor(subtotal, fee);
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
  };
}

export function formatPKR(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  const [int = "0", dec] = Math.abs(rounded).toFixed(isWhole ? 0 : 2).split(".");
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

/* ---------------- Monthly Delivery Plans ---------------- */

/** What the customer's active plan allows on this order (loaded server-side, never trusted from the client). */
export type MembershipBenefit = {
  creditsAvailable: number;
  minBasket: number;
  zoneIds: string[];
};

export type MembershipDecision = {
  applies: boolean;
  /** Why a credit can't be used (null when it applies or there is no plan). */
  reason: string | null;
  deliveryFeeWaived: number;
};

/**
 * One paid plan credit covers the delivery fee of one eligible order.
 */
export function membershipDecision(
  totals: Pick<OrderTotals, "subtotal" | "deliveryFee">,
  plan: MembershipBenefit | null,
  zoneId: string | null,
): MembershipDecision {
  const no = (reason: string | null): MembershipDecision => ({ applies: false, reason, deliveryFeeWaived: 0 });
  if (!plan) return no(null);
  if (totals.subtotal <= 0) return no(null);
  if (totals.deliveryFee <= 0) return no("There is no delivery fee to cover on this order.");
  if (plan.creditsAvailable < 1) return no("You have no delivery credits left in this period.");
  if (totals.subtotal < plan.minBasket)
    return no(`Add ${formatPKR(plan.minBasket - totals.subtotal)} more to use a plan delivery credit.`);
  if (plan.zoneIds.length > 0 && (!zoneId || !plan.zoneIds.includes(zoneId)))
    return no("Your plan doesn't cover this delivery area.");
  return { applies: true, reason: null, deliveryFeeWaived: totals.deliveryFee };
}

/** Totals after a plan credit covers the delivery fee. */
export function applyMembershipCredit(totals: OrderTotals, decision: MembershipDecision): OrderTotals & { deliveryFeeWaived: number } {
  if (!decision.applies) return { ...totals, deliveryFeeWaived: 0 };
  const waived = decision.deliveryFeeWaived;
  return { ...totals, deliveryFee: 0, total: round2(totals.total - waived), deliveryFeeWaived: waived };
}

/** Effective cost of one included delivery, e.g. Rs. 499 / 4 = Rs. 124.75. */
export function costPerDelivery(price: number, credits: number): number {
  if (credits <= 0) return 0;
  return round2(price / credits);
}
