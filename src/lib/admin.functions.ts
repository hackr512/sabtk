import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapPlan } from "./membership.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Every admin function checks the caller's role as themselves before touching privileged data. */
async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

async function profilesById(admin: any, ids: string[]) {
  if (!ids.length) return new Map<string, { full_name: string | null; phone: string | null }>();
  const { data } = await admin.from("profiles").select("id, full_name, phone").in("id", ids);
  return new Map<string, any>((data ?? []).map((p: any) => [p.id, p]));
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context);
    await admin.rpc("membership_refresh", { p_user: null });
    const [{ data: report }, { data: byPlan }] = await Promise.all([
      admin.rpc("membership_report"),
      admin.from("membership_payments").select("amount, status, refund_amount, membership_plans(name)").in("status", ["paid", "refunded"]),
    ]);
    const plans = new Map<string, { revenue: number; payments: number }>();
    for (const p of byPlan ?? []) {
      const name = p.membership_plans?.name ?? "Unknown";
      const cur = plans.get(name) ?? { revenue: 0, payments: 0 };
      cur.revenue += Number(p.amount) - Number(p.refund_amount ?? 0);
      cur.payments += 1;
      plans.set(name, cur);
    }
    const r = (report ?? {}) as Record<string, number>;
    return {
      active: Number(r.active ?? 0),
      pending: Number(r.pending ?? 0),
      cancelling: Number(r.cancelling ?? 0),
      ended: Number(r.expired ?? 0),
      grossRevenue: Number(r.revenue_paid ?? 0),
      refunded: Number(r.refunded ?? 0),
      creditsGranted: Number(r.credits_granted ?? 0),
      creditsConsumed: Number(r.credits_consumed ?? 0),
      creditsReserved: Number(r.credits_reserved ?? 0),
      redemptionCost: Number(r.redemption_cost ?? 0),
      pendingCost: Number(r.pending_cost ?? 0),
      byPlan: Array.from(plans.entries()).map(([name, v]) => ({ name, ...v })),
    };
  });

/* ---------- Plans ---------- */

export const adminListPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context);
    const { data } = await admin.from("membership_plans").select("*").order("sort_order");
    return (data ?? []).map(mapPlan);
  });

const planSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(200).optional(),
  monthlyPrice: z.number().min(1).max(100000),
  includedCredits: z.number().int().min(1).max(100),
  validityDays: z.number().int().min(7).max(366),
  minBasket: z.number().min(0).max(100000),
  maxCarryForward: z.number().int().min(0).max(100),
  zoneIds: z.array(z.string().uuid()).max(200),
  isRecommended: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

export const adminSavePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => planSchema.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    const row = {
      name: data.name,
      description: data.description || null,
      monthly_price: data.monthlyPrice,
      included_credits: data.includedCredits,
      validity_days: data.validityDays,
      min_basket: data.minBasket,
      max_carry_forward: data.maxCarryForward,
      zone_ids: data.zoneIds,
      is_recommended: data.isRecommended,
      is_active: data.isActive,
      sort_order: data.sortOrder,
    };
    if (data.isRecommended) {
      await admin.from("membership_plans").update({ is_recommended: false }).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const res = data.id
      ? await admin.from("membership_plans").update(row).eq("id", data.id)
      : await admin.from("membership_plans").insert({
          ...row,
          slug: `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
        });
    if (res.error) return { ok: false as const, error: "Could not save the plan." };
    return { ok: true as const };
  });

/* ---------- Memberships & payments ---------- */

export const adminListMemberships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context);
    await admin.rpc("membership_refresh", { p_user: null });
    const [{ data: ms }, { data: pays }] = await Promise.all([
      admin
        .from("memberships")
        .select("*, membership_plans(name), membership_cycles!memberships_current_cycle_fk(id, cycle_number, credits_granted, credits_carried, period_end, status)")
        .order("updated_at", { ascending: false })
        .limit(300),
      admin.from("membership_payments").select("*, membership_plans(name)").order("created_at", { ascending: false }).limit(300),
    ]);
    const cycleIds = (ms ?? []).map((m: any) => m.current_cycle_id).filter(Boolean);
    const { data: led } = cycleIds.length
      ? await admin.from("membership_credit_ledger").select("cycle_id, delta").in("cycle_id", cycleIds)
      : { data: [] };
    const bal = new Map<string, number>();
    for (const l of led ?? []) bal.set(l.cycle_id, (bal.get(l.cycle_id) ?? 0) + l.delta);
    const people = await profilesById(admin, Array.from(new Set([...(ms ?? []), ...(pays ?? [])].map((x: any) => x.user_id))));
    const who = (id: string) => ({ name: people.get(id)?.full_name ?? "Customer", phone: people.get(id)?.phone ?? null });
    return {
      memberships: (ms ?? []).map((m: any) => ({
        id: m.id,
        customer: who(m.user_id),
        planName: m.membership_plans?.name ?? "",
        status: m.status as string,
        cancelAtPeriodEnd: m.cancel_at_period_end as boolean,
        periodEnd: m.current_period_end as string | null,
        cycleId: m.current_cycle_id as string | null,
        cycleNumber: m.membership_cycles?.cycle_number ?? null,
        creditsTotal: m.membership_cycles ? m.membership_cycles.credits_granted + m.membership_cycles.credits_carried : 0,
        available: m.current_cycle_id ? Math.max(0, bal.get(m.current_cycle_id) ?? 0) : 0,
      })),
      payments: (pays ?? []).map((p: any) => ({
        id: p.id,
        customer: who(p.user_id),
        planName: p.membership_plans?.name ?? "",
        kind: p.kind as string,
        amount: Number(p.amount),
        status: p.status as string,
        method: p.method as string | null,
        reference: p.provider_reference as string | null,
        paidAt: p.paid_at as string | null,
        refundAmount: p.refund_amount != null ? Number(p.refund_amount) : null,
        createdAt: p.created_at as string,
      })),
    };
  });

function friendly(msg: string) {
  if (msg.includes("PAYMENT_NOT_PENDING")) return "This payment was already processed.";
  if (msg.includes("PAYMENT_NOT_PAID")) return "Only paid payments can be refunded.";
  if (msg.includes("BAD_REFUND_AMOUNT")) return "Refund amount must be between 1 and the amount paid.";
  if (msg.includes("MEMBERSHIP_NOT_PAYABLE")) return "This membership can no longer be activated. Ask the customer to choose a plan again.";
  if (msg.includes("BALANCE_BELOW_ZERO")) return "That would take the credit balance below zero.";
  if (msg.includes("CYCLE_NOT_OPEN")) return "Credits can only be adjusted on a current or upcoming cycle.";
  if (msg.includes("duplicate key")) return "That payment reference has already been used.";
  return "Something went wrong. Please try again.";
}

export const adminRecordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        method: z.enum(["cash", "bank_transfer", "easypaisa", "jazzcash"]),
        reference: z.string().trim().min(3, "Enter the receipt or transaction reference").max(80),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    const { error } = await admin.rpc("membership_record_payment", {
      p_payment: data.paymentId,
      p_method: data.method,
      p_reference: data.reference,
      p_actor: context.userId,
    });
    if (error) return { ok: false as const, error: friendly(error.message) };
    return { ok: true as const };
  });

export const adminMarkPaymentFailed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ paymentId: z.string().uuid(), note: z.string().trim().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    const { data: pay } = await admin.from("membership_payments").select("id, kind, membership_id, status").eq("id", data.paymentId).maybeSingle();
    if (!pay || pay.status !== "pending") return { ok: false as const, error: "Only pending payments can be marked failed." };
    await admin.from("membership_payments").update({ status: "failed", note: data.note || null, recorded_by: context.userId }).eq("id", pay.id);
    if (pay.kind === "new")
      await admin.from("memberships").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", pay.membership_id).eq("status", "pending_payment");
    return { ok: true as const };
  });

export const adminRefundPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ paymentId: z.string().uuid(), amount: z.number().positive(), note: z.string().trim().min(3).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    const { error } = await admin.rpc("membership_refund_payment", {
      p_payment: data.paymentId,
      p_amount: data.amount,
      p_note: data.note,
      p_actor: context.userId,
    });
    if (error) return { ok: false as const, error: friendly(error.message) };
    return { ok: true as const };
  });

export const adminAdjustCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cycleId: z.string().uuid(), delta: z.number().int().min(-50).max(50), note: z.string().trim().min(3).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    const { error } = await admin.rpc("membership_adjust_credits", {
      p_cycle: data.cycleId,
      p_delta: data.delta,
      p_note: data.note,
      p_actor: context.userId,
    });
    if (error) return { ok: false as const, error: friendly(error.message) };
    return { ok: true as const };
  });

export const adminCreditLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context);
    const { data } = await admin
      .from("membership_credit_ledger")
      .select("id, user_id, delta, kind, note, actor, created_at, orders(order_number, delivery_fee_waived), membership_cycles(plan_name, cycle_number)")
      .order("created_at", { ascending: false })
      .limit(500);
    const people = await profilesById(admin, Array.from(new Set((data ?? []).map((l: any) => l.user_id))));
    return (data ?? []).map((l: any) => ({
      id: l.id as number,
      customer: people.get(l.user_id)?.full_name ?? "Customer",
      delta: l.delta as number,
      kind: l.kind as string,
      note: l.note as string | null,
      byStaff: !!l.actor && l.actor !== l.user_id,
      orderNumber: l.orders?.order_number ?? null,
      feeCovered: l.orders ? Number(l.orders.delivery_fee_waived) : 0,
      cycle: l.membership_cycles ? `${l.membership_cycles.plan_name} #${l.membership_cycles.cycle_number}` : "",
      createdAt: l.created_at as string,
    }));
  });

/* ---------- Orders ---------- */

const ORDER_STATUSES = ["pending_confirmation", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled", "refunded"] as const;

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requireAdmin(context);
    const { data } = await admin
      .from("orders")
      .select("id, order_number, customer_name, phone, area, city, status, total, delivery_fee, delivery_fee_waived, membership_credit_status, delivery_date, delivery_window, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []).map((o: any) => ({
      id: o.id as string,
      number: o.order_number as string,
      customer: o.customer_name as string,
      phone: o.phone as string,
      area: `${o.area}, ${o.city}`,
      status: o.status as (typeof ORDER_STATUSES)[number],
      total: Number(o.total),
      deliveryFee: Number(o.delivery_fee),
      feeWaived: Number(o.delivery_fee_waived),
      creditStatus: o.membership_credit_status as string,
      deliveryDate: o.delivery_date as string,
      window: o.delivery_window as string,
      createdAt: o.created_at as string,
    }));
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid(), status: z.enum(ORDER_STATUSES) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    // Update as the admin themselves (RLS allows admins) so the audit trail records who did it.
    const { error } = await context.supabase.from("orders").update({ status: data.status }).eq("id", data.orderId);
    if (error) return { ok: false as const, error: "Could not update the order." };
    return { ok: true as const };
  });

/* ---------- Settings ---------- */

const settingsSchema = z.object({
  creditMode: z.enum(["auto", "ask"]),
  refundWindowDays: z.number().int().min(0).max(30),
  restoreOnRefund: z.boolean(),
});

export const adminSaveMembershipSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    const now = new Date().toISOString();
    const { error } = await admin.from("store_settings").upsert([
      { key: "membership_credit_mode", value: data.creditMode, updated_at: now },
      { key: "membership_refund_window_days", value: String(data.refundWindowDays), updated_at: now },
      { key: "membership_restore_credit_on_refund", value: data.restoreOnRefund ? "true" : "false", updated_at: now },
    ]);
    if (error) return { ok: false as const, error: "Could not save settings." };
    return { ok: true as const };
  });
