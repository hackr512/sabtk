import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeTotals, deliveryDateOptions, type PromoRule } from "./pricing";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function loadPromo(admin: any, code: string, subtotal: number) {
  const { data: promo } = await admin
    .from("promo_codes")
    .select("*")
    .ilike("code", code.trim())
    .maybeSingle();
  const now = Date.now();
  if (!promo || !promo.is_active) return { error: "This promo code isn't valid." } as const;
  if (promo.starts_at && new Date(promo.starts_at).getTime() > now)
    return { error: "This promo code isn't active yet." } as const;
  if (promo.ends_at && new Date(promo.ends_at).getTime() < now)
    return { error: "This promo code has expired." } as const;
  if (promo.usage_limit != null && promo.used_count >= promo.usage_limit)
    return { error: "This promo code has reached its usage limit." } as const;
  if (subtotal < Number(promo.min_subtotal))
    return {
      error: `This code needs an item subtotal of at least Rs. ${Number(promo.min_subtotal).toLocaleString("en-US")}.`,
    } as const;
  const rule: PromoRule = {
    discountType: promo.discount_type,
    value: Number(promo.value),
    minSubtotal: Number(promo.min_subtotal),
    maxDiscount: promo.max_discount != null ? Number(promo.max_discount) : null,
  };
  return { code: promo.code as string, description: promo.description as string | null, rule } as const;
}

export const checkPromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().trim().min(2).max(40), subtotal: z.number().min(0) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res = await loadPromo(supabaseAdmin, data.code, data.subtotal);
    if ("error" in res) return { ok: false as const, error: res.error };
    return { ok: true as const, code: res.code, description: res.description, rule: res.rule };
  });

const placeOrderSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(100) }))
    .min(1, "Your cart is empty")
    .max(100),
  customerName: z.string().trim().min(2, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(\+92|0)3\d{2}-?\d{7}$/, "Enter a valid Pakistani mobile number, e.g. 03001234567"),
  zoneId: z.string().uuid("Choose your delivery area"),
  addressLine: z.string().trim().min(5, "Enter your full address").max(300),
  instructions: z.string().trim().max(300).optional(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  windowId: z.string().uuid("Choose a delivery window"),
  paymentMethod: z.literal("cod"),
  promoCode: z.string().trim().max(40).optional(),
  rewardId: z.string().uuid().optional(),
  notes: z.string().trim().max(300).optional(),
  saveAddress: z.boolean().optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => placeOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Merge duplicate lines
    const qtyById = new Map<string, number>();
    for (const i of data.items) qtyById.set(i.productId, (qtyById.get(i.productId) ?? 0) + i.quantity);
    const ids = Array.from(qtyById.keys());

    const { data: products, error: pErr } = await admin
      .from("products")
      .select("id, name, brand, pack_size, images, price, stock_quantity, max_per_order, points_eligible, is_active")
      .in("id", ids);
    if (pErr) return { ok: false as const, error: "We couldn't check stock right now. Please try again." };

    const problems: string[] = [];
    const lines: any[] = [];
    for (const id of ids) {
      const p = products?.find((x) => x.id === id);
      const qty = qtyById.get(id)!;
      if (!p || !p.is_active) {
        problems.push("An item in your cart is no longer available.");
        continue;
      }
      if (qty > p.max_per_order) problems.push(`${p.name}: maximum ${p.max_per_order} per order.`);
      if (p.stock_quantity < qty)
        problems.push(
          p.stock_quantity === 0
            ? `${p.name} is out of stock.`
            : `${p.name}: only ${p.stock_quantity} left in stock.`,
        );
      lines.push({ p, qty });
    }
    if (problems.length) return { ok: false as const, error: problems.join(" ") };

    const [{ data: zone }, { data: win }] = await Promise.all([
      admin.from("delivery_zones").select("id, city, area, is_active").eq("id", data.zoneId).maybeSingle(),
      admin.from("delivery_windows").select("id, label, is_active").eq("id", data.windowId).maybeSingle(),
    ]);
    if (!zone || !zone.is_active)
      return { ok: false as const, error: "Sorry, we don't deliver to this area yet." };
    if (!win || !win.is_active)
      return { ok: false as const, error: "That delivery window is no longer available." };
    if (!deliveryDateOptions().includes(data.deliveryDate))
      return { ok: false as const, error: "Please choose one of the available delivery dates." };

    const subtotalPre = lines.reduce((s, l) => s + Number(l.p.price) * l.qty, 0);
    let promoRule: PromoRule | null = null;
    let promoCode: string | null = null;
    if (data.promoCode) {
      const res = await loadPromo(admin, data.promoCode, subtotalPre);
      if ("error" in res) return { ok: false as const, error: res.error };
      promoRule = res.rule;
      promoCode = res.code;
    }

    const totals = computeTotals(
      lines.map((l) => ({ unitPrice: Number(l.p.price), quantity: l.qty, pointsEligible: l.p.points_eligible })),
      promoRule,
    );

    const items = lines.map((l) => ({
      product_id: l.p.id,
      name: l.p.name,
      brand: l.p.brand ?? "",
      pack_size: l.p.pack_size,
      image: l.p.images?.[0] ?? "",
      unit_price: Number(l.p.price),
      quantity: l.qty,
      line_total: Math.round(Number(l.p.price) * l.qty * 100) / 100,
      is_reward: false,
    }));

    let pointsRedeemed = 0;
    if (data.rewardId) {
      const { data: reward } = await admin
        .from("rewards")
        .select("id, name, points_required, is_active, product_id")
        .eq("id", data.rewardId)
        .maybeSingle();
      if (!reward || !reward.is_active || !reward.product_id)
        return { ok: false as const, error: "That reward isn't available right now." };
      const { data: ledger } = await admin.from("loyalty_ledger").select("points").eq("user_id", userId);
      const balance = (ledger ?? []).reduce((s, r) => s + r.points, 0);
      if (balance < reward.points_required)
        return {
          ok: false as const,
          error: `You need ${reward.points_required} points for this reward. Your balance is ${balance}.`,
        };
      const { data: rp } = await admin
        .from("products")
        .select("id, name, brand, pack_size, images, stock_quantity, is_active")
        .eq("id", reward.product_id)
        .maybeSingle();
      const alreadyInCart = qtyById.get(reward.product_id) ?? 0;
      if (!rp || !rp.is_active || rp.stock_quantity < alreadyInCart + 1)
        return { ok: false as const, error: "The reward item is out of stock. Please try again later." };
      pointsRedeemed = reward.points_required;
      items.push({
        product_id: rp.id,
        name: `${rp.name} (Reward)`,
        brand: rp.brand ?? "",
        pack_size: rp.pack_size,
        image: rp.images?.[0] ?? "",
        unit_price: 0,
        quantity: 1,
        line_total: 0,
        is_reward: true,
      });
    }

    // create_order locks per user, re-checks points, and decrements stock atomically.
    // Reward lines share a product row with paid lines, so stock is decremented per line.
    const { data: created, error: cErr } = await admin.rpc("create_order", {
      p: {
        user_id: userId,
        payment_method: "cod",
        customer_name: data.customerName,
        phone: data.phone,
        zone_id: zone.id,
        city: zone.city,
        area: zone.area,
        address_line: data.addressLine,
        instructions: data.instructions ?? "",
        delivery_date: data.deliveryDate,
        delivery_window: win.label,
        subtotal: totals.subtotal,
        discount_total: totals.discount,
        delivery_fee: totals.deliveryFee,
        total: totals.total,
        eligible_points_subtotal: totals.eligiblePointsSubtotal,
        points_to_earn: totals.pointsToEarn,
        points_redeemed: pointsRedeemed,
        reward_id: data.rewardId ?? "",
        promo_code: promoCode ?? "",
        notes: data.notes ?? "",
        items,
      },
    });
    if (cErr) {
      const msg = cErr.message || "";
      if (msg.includes("OUT_OF_STOCK"))
        return {
          ok: false as const,
          error: `${msg.split("OUT_OF_STOCK:")[1]?.trim() || "An item"} just went out of stock. Please update your cart.`,
        };
      if (msg.includes("INSUFFICIENT_POINTS"))
        return { ok: false as const, error: "You don't have enough points for this reward." };
      console.error("create_order failed", cErr);
      return { ok: false as const, error: "We couldn't place your order. Nothing was charged. Please try again." };
    }

    // Best-effort profile + address save (never blocks the order)
    await admin
      .from("profiles")
      .update({ full_name: data.customerName, phone: data.phone })
      .eq("id", userId)
      .is("phone", null);
    if (data.saveAddress) {
      const { count } = await admin
        .from("addresses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      await admin.from("addresses").insert({
        user_id: userId,
        full_name: data.customerName,
        phone: data.phone,
        zone_id: zone.id,
        address_line: data.addressLine,
        instructions: data.instructions || null,
        is_default: !count,
      });
    }

    const result = created as { order_id: string; order_number: string };
    return { ok: true as const, orderId: result.order_id, orderNumber: result.order_number };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Ownership check through RLS as the user
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, status, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.user_id !== context.userId) return { ok: false as const, error: "Order not found." };
    if (order.status !== "pending_confirmation")
      return {
        ok: false as const,
        error: "This order is already being processed. Please send a cancellation request to support.",
      };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("status", "pending_confirmation");
    if (error) return { ok: false as const, error: "Could not cancel the order. Please try again." };
    return { ok: true as const };
  });
