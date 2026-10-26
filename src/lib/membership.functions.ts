import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicClient } from "./public-client.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type MembershipPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  includedCredits: number;
  validityDays: number;
  minBasket: number;
  maxCarryForward: number;
  zoneIds: string[];
  isRecommended: boolean;
  isActive: boolean;
  sortOrder: number;
};

export function mapPlan(p: any): MembershipPlan {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    monthlyPrice: Number(p.monthly_price),
    includedCredits: p.included_credits,
    validityDays: p.validity_days,
    minBasket: Number(p.min_basket),
    maxCarryForward: p.max_carry_forward,
    zoneIds: p.zone_ids ?? [],
    isRecommended: p.is_recommended,
    isActive: p.is_active,
    sortOrder: p.sort_order,
  };
}

/** Public: active plans plus the disclosed membership policy settings. */
export const getMembershipPlans = createServerFn({ method: "GET" }).handler(async () => {
  const db = createPublicClient();
  const [{ data, error }, { data: settings }] = await Promise.all([
    db.from("membership_plans").select("*").eq("is_active", true).order("sort_order"),
    db.from("store_settings").select("key, value").like("key", "membership_%"),
  ]);
  if (error) throw new Error("Could not load membership plans");
  const s = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value ?? ""]));
  return {
    plans: (data ?? []).map(mapPlan),
    policy: {
      creditMode: (s.membership_credit_mode === "ask" ? "ask" : "auto") as "auto" | "ask",
      refundWindowDays: Number(s.membership_refund_window_days || 3),
      restoreOnRefund: s.membership_restore_credit_on_refund !== "false",
      onlinePaymentEnabled: s.membership_online_payment_enabled === "true",
    },
  };
});

export type LedgerEntry = {
  id: number;
  delta: number;
  kind: string;
  note: string | null;
  orderNumber: string | null;
  createdAt: string;
};

/** Signed-in customer's membership, current cycle balance, payments and credit history. */
export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("membership_refresh", { p_user: context.userId });
    const db = context.supabase;
    const [{ data: memberships }, { data: payments }, { data: ledger }, { data: cycles }] = await Promise.all([
      db.from("memberships").select("*, membership_plans(*)").order("created_at", { ascending: false }).limit(10),
      db.from("membership_payments").select("*, membership_plans(name)").order("created_at", { ascending: false }).limit(30),
      db
        .from("membership_credit_ledger")
        .select("id, delta, kind, note, cycle_id, created_at, orders(order_number)")
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("membership_cycles").select("*").order("period_start", { ascending: false }).limit(24),
    ]);

    const current = (memberships ?? []).find((m) => m.status === "active" || m.status === "pending_payment") ?? null;
    const cycle = current?.current_cycle_id ? (cycles ?? []).find((c) => c.id === current.current_cycle_id) ?? null : null;
    const balance = (cycleId: string) =>
      (ledger ?? []).filter((l) => l.cycle_id === cycleId).reduce((s, l) => s + l.delta, 0);
    const scheduled = current ? (cycles ?? []).find((c) => c.membership_id === current.id && c.status === "scheduled") : null;
    const reserved = cycle
      ? (ledger ?? []).filter((l) => l.cycle_id === cycle.id && l.kind === "reserve").length -
        (ledger ?? []).filter((l) => l.cycle_id === cycle.id && (l.kind === "release" || l.kind === "consume")).length
      : 0;

    return {
      membership: current
        ? {
            id: current.id,
            status: current.status as "pending_payment" | "active",
            cancelAtPeriodEnd: current.cancel_at_period_end,
            periodStart: current.current_period_start,
            periodEnd: current.current_period_end,
            plan: mapPlan(current.membership_plans),
          }
        : null,
      cycle: cycle
        ? {
            id: cycle.id,
            planName: cycle.plan_name,
            number: cycle.cycle_number,
            periodStart: cycle.period_start,
            periodEnd: cycle.period_end,
            granted: cycle.credits_granted,
            carried: cycle.credits_carried,
            available: Math.max(0, balance(cycle.id)),
            onHold: Math.max(0, reserved),
            minBasket: Number(cycle.min_basket),
            zoneIds: cycle.zone_ids ?? [],
            maxCarryForward: cycle.max_carry_forward,
          }
        : null,
      scheduledRenewal: scheduled
        ? { planName: scheduled.plan_name, periodStart: scheduled.period_start, credits: scheduled.credits_granted }
        : null,
      payments: (payments ?? []).map((p: any) => ({
        id: p.id,
        kind: p.kind as "new" | "renewal",
        planName: p.membership_plans?.name ?? "",
        amount: Number(p.amount),
        status: p.status as string,
        method: p.method as string | null,
        paidAt: p.paid_at as string | null,
        refundAmount: p.refund_amount != null ? Number(p.refund_amount) : null,
        createdAt: p.created_at as string,
      })),
      history: (memberships ?? []).map((m: any) => ({
        id: m.id,
        planName: m.membership_plans?.name ?? "",
        status: m.status as string,
        periodEnd: m.current_period_end as string | null,
        createdAt: m.created_at as string,
      })),
      ledger: (ledger ?? []).map(
        (l: any): LedgerEntry => ({
          id: l.id,
          delta: l.delta,
          kind: l.kind,
          note: l.note,
          orderNumber: l.orders?.order_number ?? null,
          createdAt: l.created_at,
        }),
      ),
    };
  });

/** Starts a membership (or the next renewal). It stays pending until a real payment is recorded. */
export const requestMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    await admin.rpc("membership_refresh", { p_user: userId });

    const { data: plan } = await admin.from("membership_plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan || !plan.is_active) return { ok: false as const, error: "This plan isn't available right now." };

    const { data: open } = await admin
      .from("memberships")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["pending_payment", "active"])
      .maybeSingle();

    if (open?.status === "pending_payment")
      return { ok: false as const, error: "You already have a membership request waiting for payment." };

    if (open?.status === "active") {
      const [{ data: pending }, { data: scheduled }] = await Promise.all([
        admin.from("membership_payments").select("id").eq("membership_id", open.id).eq("status", "pending").maybeSingle(),
        admin.from("membership_cycles").select("id").eq("membership_id", open.id).eq("status", "scheduled").maybeSingle(),
      ]);
      if (pending) return { ok: false as const, error: "Your renewal is already waiting for payment." };
      if (scheduled) return { ok: false as const, error: "Your next month is already paid for." };
      const { error } = await admin.from("membership_payments").insert({
        membership_id: open.id,
        user_id: userId,
        plan_id: plan.id,
        kind: "renewal",
        amount: plan.monthly_price,
      });
      if (error) return { ok: false as const, error: "Could not start your renewal. Please try again." };
      await admin.from("memberships").update({ cancel_at_period_end: false, cancelled_at: null }).eq("id", open.id);
      return { ok: true as const, kind: "renewal" as const };
    }

    const { data: m, error: mErr } = await admin
      .from("memberships")
      .insert({ user_id: userId, plan_id: plan.id, status: "pending_payment" })
      .select("id")
      .single();
    if (mErr || !m) return { ok: false as const, error: "Could not start your membership. Please try again." };
    const { error: pErr } = await admin.from("membership_payments").insert({
      membership_id: m.id,
      user_id: userId,
      plan_id: plan.id,
      kind: "new",
      amount: plan.monthly_price,
    });
    if (pErr) {
      await admin.from("memberships").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", m.id);
      return { ok: false as const, error: "Could not start your membership. Please try again." };
    }
    return { ok: true as const, kind: "new" as const };
  });

/** Withdraw a request that hasn't been paid yet. */
export const withdrawMembershipRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: pay } = await admin
      .from("membership_payments")
      .select("id, user_id, status, kind, membership_id")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!pay || pay.user_id !== context.userId) return { ok: false as const, error: "Request not found." };
    if (pay.status !== "pending") return { ok: false as const, error: "This payment has already been processed." };
    await admin.from("membership_payments").update({ status: "cancelled" }).eq("id", pay.id).eq("status", "pending");
    if (pay.kind === "new")
      await admin
        .from("memberships")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", pay.membership_id)
        .eq("status", "pending_payment");
    return { ok: true as const };
  });

/** Stop renewing: benefits continue until the end of the paid billing cycle. */
export const setMembershipCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cancel: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await admin
      .from("memberships")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!m) return { ok: false as const, error: "You don't have an active membership." };
    if (data.cancel) {
      const { data: scheduled } = await admin
        .from("membership_cycles")
        .select("id")
        .eq("membership_id", m.id)
        .eq("status", "scheduled")
        .maybeSingle();
      if (scheduled)
        return {
          ok: false as const,
          error: "Your next month is already paid. Contact support to cancel it and request a refund.",
        };
      await admin.from("membership_payments").update({ status: "cancelled" }).eq("membership_id", m.id).eq("status", "pending");
    }
    const { error } = await admin
      .from("memberships")
      .update({ cancel_at_period_end: data.cancel, cancelled_at: data.cancel ? new Date().toISOString() : null })
      .eq("id", m.id);
    if (error) return { ok: false as const, error: "Could not update your membership. Please try again." };
    return { ok: true as const };
  });
