export const ORDER_STATUS: Record<string, { label: string; tone: "success" | "warning" | "muted" | "lime" | "loyalty" }> = {
  pending_confirmation: { label: "Pending Confirmation", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  preparing: { label: "Preparing", tone: "success" },
  ready_for_dispatch: { label: "Ready for Dispatch", tone: "success" },
  failed_delivery: { label: "Failed Delivery", tone: "warning" },
  return_requested: { label: "Return Requested", tone: "warning" },
  returned: { label: "Returned", tone: "muted" },
  out_for_delivery: { label: "Out for Delivery", tone: "lime" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "muted" },
  refunded: { label: "Refunded", tone: "loyalty" },
};

export const ORDER_FLOW = ["pending_confirmation", "confirmed", "preparing", "out_for_delivery", "delivered"] as const;

export function statusOf(s: string) {
  return ORDER_STATUS[s] ?? { label: s, tone: "muted" as const };
}

export const ORDER_STATUSES = ["pending_confirmation", "confirmed", "preparing", "ready_for_dispatch", "out_for_delivery", "delivered", "cancelled", "failed_delivery", "return_requested", "returned", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const TRANSITIONS: Record<string, readonly string[]> = {
  pending_confirmation: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_dispatch", "out_for_delivery", "cancelled"], ready_for_dispatch: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "failed_delivery", "cancelled"], delivered: ["return_requested", "refunded"],
  return_requested: ["delivered", "returned", "refunded"], returned: ["refunded"],
};
export function validOrderTransition(from: string, to: string): boolean { return from === to || (TRANSITIONS[from]?.includes(to) ?? false); }
