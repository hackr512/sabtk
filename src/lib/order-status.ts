export const ORDER_STATUS: Record<string, { label: string; tone: "success" | "warning" | "muted" | "lime" | "loyalty" }> = {
  pending_confirmation: { label: "Pending Confirmation", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  preparing: { label: "Preparing", tone: "success" },
  out_for_delivery: { label: "Out for Delivery", tone: "lime" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "muted" },
  refunded: { label: "Refunded", tone: "loyalty" },
};

export const ORDER_FLOW = ["pending_confirmation", "confirmed", "preparing", "out_for_delivery", "delivered"] as const;

export function statusOf(s: string) {
  return ORDER_STATUS[s] ?? { label: s, tone: "muted" as const };
}
