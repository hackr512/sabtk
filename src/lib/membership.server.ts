/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin as admin } from "@/integrations/supabase/client.server";

// Server-only: loads a customer's plan, credits and history with the privileged client.
export type MyMembership = Awaited<ReturnType<typeof loadMyMembership>>;

export async function loadMyMembership(userId: string) {
  await admin.rpc("membership_refresh", { p_user: userId });
  const [{ data: ms }, { data: cycles }, { data: payments }, { data: plans }, { data: allOrders }, { data: ledger }] = await Promise.all([
    admin.from("memberships").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("membership_cycles").select("*").eq("user_id", userId).order("period_start", { ascending: false }),
    admin.from("membership_payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("membership_plans").select("id, name"),
    admin.from("orders").select("membership_cycle_id,membership_credit_status").eq("user_id", userId),
    admin.from("membership_credit_ledger").select("cycle_id,delta,kind").eq("user_id", userId),
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
    purchasedAt: string;
    paymentStatus: string;
  };

  if (open) {
    const cycle = (cycles ?? []).find((c) => c.id === open.current_cycle_id) ?? (cycles ?? []).find(c => c.membership_id === open.id && payments?.some(p => p.id === c.payment_id && p.status === "pending")) ?? null;
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
      purchasedAt: open.created_at,
      paymentStatus: payments?.find(p => p.id === cycle?.payment_id)?.status ?? "pending",
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
      paymentStatus: payments?.find(p => p.id === c.payment_id)?.status ?? "pending",
      purchasedAt: payments?.find(p => p.id === c.payment_id)?.created_at ?? c.created_at,
      used: (allOrders ?? []).filter(o => o.membership_cycle_id === c.id && o.membership_credit_status === "consumed").length,
      reserved: (allOrders ?? []).filter(o => o.membership_cycle_id === c.id && o.membership_credit_status === "reserved").length,
      remaining: Math.max(0, (ledger ?? []).filter(l => l.cycle_id === c.id).reduce((s,l) => s+l.delta,0)),
      activatedAt: payments?.find(p => p.id === c.payment_id)?.paid_at ?? null,
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

