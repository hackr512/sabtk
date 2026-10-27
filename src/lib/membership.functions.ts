import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicClient } from "./public-client.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  benefits: string[];
  price: number;
  credits: number;
  validityDays: number;
  minBasket: number;
  maxCarryForward: number;
  zoneIds: string[];
  isRecommended: boolean;
};

export function mapPlan(r: any): Plan {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    benefits: r.benefits ?? [],
    price: Number(r.monthly_price),
    credits: r.included_credits,
    validityDays: r.validity_days,
    minBasket: Number(r.min_basket),
    maxCarryForward: r.max_carry_forward,
    zoneIds: r.zone_ids ?? [],
    isRecommended: r.is_recommended,
  };
}

export const getPlans = createServerFn({ method: "GET" }).handler(async () => {
  const db = createPublicClient();
  const [{ data, error }, { data: settings }] = await Promise.all([
    db.from("membership_plans").select("*").eq("is_active", true).order("sort_order"),
    db.from("store_settings").select("key, value").in("key", ["membership_enabled", "membership_payment_instructions"]),
  ]);
  if (error) throw new Error("Could not load plans");
  const s = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value ?? ""]));
  return {
    plans: (data ?? []).map(mapPlan),
    enabled: s["membership_enabled"] !== "false",
    paymentInstructions: s["membership_payment_instructions"] || "",
  };
});

export type MyMembership = Awaited<ReturnType<typeof loadMyMembership>>;

export async function loadMyMembership(userId: string) {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  await admin.rpc("membership_refresh", { p_user: userId });
  const [{ data: ms }, { data: cycles }, { data: payments }, { data: plans }] = await Promise.all([
    admin.from("memberships").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("membership_cycles").select("*").eq("user_id", userId).order("period_start", { ascending: false }),
    admin.from("membership_payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("membership_plans").select("id, name"),
  ]);
  const planName = (id: string) => plans?.find((p) => p.id === id)?.name ?? "Plan";
  const open = (ms ?? []).find((m) => ["pending_payment", "active", "suspended"].includes(m.status)) ?? null;

  let current = null as null | {
    membershipId: string;
    status: string;
    planId: string;
    planName: string;
    periodStart: string | null;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    renewalScheduled: boolean;
    cycleId: string | null;
    credits: { granted: number; available: number; used: number; held: number };
    minBasket: number;
    zoneIds: string[];
  };

  if (open) {
    const cycle = (cycles ?? []).find((c) => c.id === open.current_cycle_id) ?? null;
    let credits = { granted: 0, available: 0, used: 0, held: 0 };
    if (cycle) {
      const [{ data: avail }, { data: orders }] = await Promise.all([
        admin.rpc("membership_available_credits", { p_cycle: cycle.id }),
        admin.from("orders").select("membership_credit_status").eq("membership_cycle_id", cycle.id),
      ]);
      credits = {
        granted: cycle.credits_granted + cycle.credits_carried,
        available: Math.max(0, Number(avail ?? 0)),
        used: (orders ?? []).filter((o) => o.membership_credit_status === "consumed").length,
        held: (orders ?? []).filter((o) => o.membership_credit_status === "reserved").length,
      };
    }
    current = {
      membershipId: open.id,
      status: open.status,
      planId: open.plan_id,
      planName: cycle?.plan_name ?? planName(open.plan_id),
      periodStart: open.current_period_start,
      periodEnd: open.current_period_end,
      cancelAtPeriodEnd: open.cancel_at_period_end,
      renewalScheduled: (cycles ?? []).some((c) => c.membership_id === open.id && c.status === "scheduled"),
      cycleId: cycle?.id ?? null,
      credits,
      minBasket: Number(cycle?.min_basket ?? 0),
      zoneIds: cycle?.zone_ids ?? [],
    };
  }

  const pending = (payments ?? []).find((p) => p.status === "pending") ?? null;
  return {
    current,
    pendingPayment: pending
      ? { id: pending.id, kind: pending.kind, amount: Number(pending.amount), planName: planName(pending.plan_id), createdAt: pending.created_at, membershipId: pending.membership_id }
      : null,
    cycles: (cycles ?? []).map((c) => ({
      id: c.id,
      cycleNumber: c.cycle_number,
      planName: c.plan_name,
      price: Number(c.price),
      periodStart: c.period_start,
      periodEnd: c.period_end,
      status: c.status,
      creditsGranted: c.credits_granted + c.credits_carried,
    })),
    payments: (payments ?? []).map((p) => ({
      id: p.id,
      kind: p.kind,
      amount: Number(p.amount),
      status: p.status,
      method: p.method,
      planName: planName(p.plan_id),
      createdAt: p.created_at,
      paidAt: p.paid_at,
    })),
  };
}

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadMyMembership(context.userId));

const REQUEST_ERRORS: Record<string, string> = {
  PLAN_UNAVAILABLE: "This plan isn't available right now.",
  MEMBERSHIP_SUSPENDED: "Your subscription is suspended. Please contact support.",
  ALREADY_PENDING: "You already have a plan request waiting for payment confirmation.",
  ALREADY_RENEWED: "Your next month is already paid and scheduled.",
};

export const requestPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ planId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.from("store_settings").select("value").eq("key", "membership_enabled").maybeSingle();
    if (s?.value === "false") return { ok: false as const, error: "New subscriptions are paused right now." };
    const { data: res, error } = await supabaseAdmin.rpc("membership_request", { p_user: context.userId, p_plan: data.planId });
    if (error) {
      const key = Object.keys(REQUEST_ERRORS).find((k) => error.message.includes(k));
      if (!key) console.error("membership_request failed", error);
      return { ok: false as const, error: key ? REQUEST_ERRORS[key]! : "We couldn't save your request. Please try again." };
    }
    const r = res as { kind: string; amount: number };
    return { ok: true as const, kind: r.kind, amount: Number(r.amount) };
  });

export const cancelMyPlanRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ membershipId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: m } = await context.supabase
      .from("memberships")
      .select("id, user_id, status")
      .eq("id", data.membershipId)
      .maybeSingle();
    if (!m || m.user_id !== context.userId) return { ok: false as const, error: "Request not found." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (m.status === "pending_payment") {
      const { error } = await supabaseAdmin.rpc("membership_set_status", {
        p_membership: m.id, p_action: "cancel", p_actor: context.userId, p_note: "Cancelled by customer before payment",
      });
      if (error) return { ok: false as const, error: "Could not cancel the request." };
      return { ok: true as const };
    }
    // Active plan: cancel only the pending renewal payment
    const { error } = await supabaseAdmin
      .from("membership_payments")
      .update({ status: "cancelled", note: "Renewal request cancelled by customer" })
      .eq("membership_id", m.id)
      .eq("status", "pending");
    if (error) return { ok: false as const, error: "Could not cancel the request." };
    return { ok: true as const };
  });
