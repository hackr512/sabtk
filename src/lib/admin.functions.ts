import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Every admin function verifies the caller's role in the database first. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: admin access only");
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

const fail = (error: string) => ({ ok: false as const, error });

/* ---------------- Dashboard ---------------- */

export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const c = (q: any) => q.then((r: any) => r.count ?? 0);
    const [products, active, drafts, orders, pending, subs, pendingPays, lowStock] = await Promise.all([
      c(db.from("products").select("id", { count: "exact", head: true }).eq("is_archived", false)),
      c(db.from("products").select("id", { count: "exact", head: true }).eq("is_active", true)),
      c(db.from("products").select("id", { count: "exact", head: true }).eq("is_active", false).eq("is_archived", false)),
      c(db.from("orders").select("id", { count: "exact", head: true })),
      c(db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_confirmation")),
      c(db.from("memberships").select("id", { count: "exact", head: true }).eq("status", "active")),
      c(db.from("membership_payments").select("id", { count: "exact", head: true }).eq("status", "pending")),
      c(db.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).lte("stock_quantity", 5)),
    ]);
    const { data: recent } = await db
      .from("orders")
      .select("id, order_number, customer_name, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6);
    return { products, active, drafts, orders, pending, subs, pendingPays, lowStock, recent: recent ?? [] };
  });

/* ---------------- Products ---------------- */

const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Enter a product name").max(120),
    categoryId: z.string().uuid("Choose a category"),
    brand: z.string().trim().max(60).optional().default(""),
    images: z.array(z.string().url()).max(6).default([]),
    description: z.string().trim().max(3000).optional().default(""),
    sku: z.string().trim().max(60).optional().default(""),
    purchaseCost: z.number().min(0, "Purchase cost can't be negative").max(10_000_000).nullable(),
    price: z.number().positive("Selling price must be more than 0").max(10_000_000),
    compareAtPrice: z.number().positive().max(10_000_000).nullable(),
    packSize: z.string().trim().min(1, "Enter the pack size or weight").max(40),
    stock: z.number().int("Stock must be a whole number").min(0, "Stock can't be negative").max(1_000_000),
    maxPerOrder: z.number().int().min(1).max(100).default(10),
    status: z.enum(["active", "draft"]),
    featured: z.boolean(),
    pointsEligible: z.boolean().default(true),
  })
  .refine((p) => p.compareAtPrice == null || p.compareAtPrice > p.price, {
    message: "The 'was' price must be higher than the selling price",
    path: ["compareAtPrice"],
  });

export type ProductInput = z.input<typeof productSchema>;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "product";
}

function parseUnit(pack: string): { unit: string | null; unit_quantity: number | null } {
  const m = pack.trim().toLowerCase().match(/^([\d.]+)\s*(kg|g|l|ltr|litre|ml|pc|pcs|pieces?)\b/);
  if (!m) return { unit: null, unit_quantity: null };
  const n = Number(m[1]);
  const u = m[2]!;
  const unit = u === "l" || u.startsWith("lit") || u === "ltr" ? "L" : u.startsWith("p") ? "pc" : u;
  return Number.isFinite(n) && n > 0 ? { unit, unit_quantity: n } : { unit: null, unit_quantity: null };
}

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().max(80).optional(),
        status: z.enum(["all", "active", "draft", "archived"]).default("all"),
        categoryId: z.string().uuid().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("products")
      .select("id, slug, name, brand, sku, pack_size, price, purchase_cost, stock_quantity, images, is_active, is_archived, is_featured, category_id, updated_at, categories(name)")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (data.status === "active") q = q.eq("is_active", true);
    if (data.status === "draft") q = q.eq("is_active", false).eq("is_archived", false);
    if (data.status === "archived") q = q.eq("is_archived", true);
    if (data.status === "all") q = q.eq("is_archived", false);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.q?.trim()) {
      const t = data.q.trim().replace(/[%,()]/g, " ");
      q = q.or(`name.ilike.%${t}%,brand.ilike.%${t}%,sku.ilike.%${t}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error("Could not load products");
    return (rows ?? []).map((r: any) => ({
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      brand: r.brand as string | null,
      sku: r.sku as string | null,
      packSize: r.pack_size as string,
      price: Number(r.price),
      purchaseCost: r.purchase_cost != null ? Number(r.purchase_cost) : null,
      stock: r.stock_quantity as number,
      image: (r.images?.[0] as string | undefined) ?? null,
      status: r.is_archived ? "archived" : r.is_active ? "active" : "draft",
      featured: r.is_featured as boolean,
      category: r.categories?.name ?? "",
    }));
  });

export const adminGetProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: p } = await context.supabase.from("products").select("*").eq("id", data.id).maybeSingle();
    if (!p) return null;
    return {
      id: p.id as string,
      slug: p.slug as string,
      name: p.name as string,
      categoryId: p.category_id as string,
      brand: (p.brand ?? "") as string,
      images: (p.images ?? []) as string[],
      description: (p.description ?? "") as string,
      sku: (p.sku ?? "") as string,
      purchaseCost: p.purchase_cost != null ? Number(p.purchase_cost) : null,
      price: Number(p.price),
      compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
      packSize: p.pack_size as string,
      stock: p.stock_quantity as number,
      maxPerOrder: p.max_per_order as number,
      status: (p.is_active ? "active" : "draft") as "active" | "draft",
      archived: p.is_archived as boolean,
      featured: p.is_featured as boolean,
      pointsEligible: p.points_eligible as boolean,
    };
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const r = productSchema.safeParse(d);
    if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Please check the form");
    return r.data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row: Record<string, unknown> = {
      name: data.name,
      category_id: data.categoryId,
      brand: data.brand || null,
      images: data.images,
      description: data.description || null,
      sku: data.sku || null,
      purchase_cost: data.purchaseCost,
      price: data.price,
      compare_at_price: data.compareAtPrice,
      pack_size: data.packSize,
      ...parseUnit(data.packSize),
      stock_quantity: data.stock,
      max_per_order: data.maxPerOrder,
      is_active: data.status === "active",
      is_featured: data.featured,
      points_eligible: data.pointsEligible,
    };
    if (data.id) {
      row["is_archived"] = false;
      const { error } = await context.supabase.from("products").update(row as any).eq("id", data.id);
      if (error) return fail(error.code === "23505" ? "That SKU or link is already used by another product." : "Could not save the product.");
      return { ok: true as const, id: data.id };
    }
    const base = slugify(`${data.brand ? data.brand + " " : ""}${data.name} ${data.packSize}`);
    for (let attempt = 0; attempt < 4; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: created, error } = await context.supabase
        .from("products")
        .insert({ ...row, slug } as any)
        .select("id")
        .single();
      if (!error) return { ok: true as const, id: created.id as string };
      if (error.code !== "23505") {
        console.error("product insert failed", error);
        return fail("Could not save the product.");
      }
    }
    return fail("Could not create a unique link for this product. Try a slightly different name.");
  });

export const adminProductAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["publish", "unpublish", "archive", "restore", "delete"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    if (data.action === "delete") {
      const { error } = await db.from("products").delete().eq("id", data.id);
      if (!error) return { ok: true as const, message: "Product deleted" };
      if (error.code === "23503") {
        await db.from("products").update({ is_active: false, is_archived: true }).eq("id", data.id);
        return { ok: true as const, message: "This product is in past orders, so it was archived instead of deleted" };
      }
      return fail("Could not delete the product.");
    }
    const patch =
      data.action === "publish"
        ? { is_active: true, is_archived: false }
        : data.action === "unpublish"
          ? { is_active: false }
          : data.action === "archive"
            ? { is_active: false, is_archived: true }
            : { is_archived: false };
    const { error } = await db.from("products").update(patch).eq("id", data.id);
    if (error) return fail("Could not update the product.");
    const msg = { publish: "Published", unpublish: "Moved to draft", archive: "Archived", restore: "Restored as draft" }[data.action];
    return { ok: true as const, message: msg };
  });

export const adminQuickUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        price: z.number().positive("Price must be more than 0").max(10_000_000),
        stock: z.number().int().min(0, "Stock can't be negative").max(1_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("products")
      .update({ price: data.price, stock_quantity: data.stock })
      .eq("id", data.id);
    if (error)
      return fail(error.code === "23514" ? "The selling price must stay below the product's 'was' price." : "Could not update.");
    return { ok: true as const };
  });

/* ---------------- Orders ---------------- */

const ORDER_STATUSES = ["pending_confirmation", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled", "refunded"] as const;

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["all", ...ORDER_STATUSES]).default("all"), q: z.string().max(60).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("orders")
      .select("id, order_number, customer_name, phone, area, city, total, delivery_fee, delivery_fee_waived, membership_credit_status, status, payment_status, delivery_date, delivery_window, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.q?.trim()) {
      const t = data.q.trim().replace(/[%,()]/g, " ");
      q = q.or(`order_number.ilike.%${t}%,customer_name.ilike.%${t}%,phone.ilike.%${t}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error("Could not load orders");
    return rows ?? [];
  });

export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(ORDER_STATUSES) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "delivered") patch["payment_status"] = "paid";
    const { error } = await context.supabase.from("orders").update(patch as any).eq("id", data.id);
    if (error) {
      console.error("order status update failed", error);
      return fail("Could not update the order status.");
    }
    return { ok: true as const };
  });

/* ---------------- Plans ---------------- */

export const adminListPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const [{ data: plans }, { data: ms }, { data: zones }] = await Promise.all([
      db.from("membership_plans").select("*").order("sort_order"),
      db.from("memberships").select("plan_id, status"),
      db.from("delivery_zones").select("id, city, area").eq("is_active", true).order("sort_order"),
    ]);
    return {
      zones: zones ?? [],
      plans: (plans ?? []).map((p: any) => ({
        id: p.id as string,
        slug: p.slug as string,
        name: p.name as string,
        description: (p.description ?? "") as string,
        benefits: (p.benefits ?? []) as string[],
        price: Number(p.monthly_price),
        credits: p.included_credits as number,
        validityDays: p.validity_days as number,
        minBasket: Number(p.min_basket),
        maxCarryForward: p.max_carry_forward as number,
        zoneIds: (p.zone_ids ?? []) as string[],
        isActive: p.is_active as boolean,
        isRecommended: p.is_recommended as boolean,
        active: (ms ?? []).filter((m) => m.plan_id === p.id && m.status === "active").length,
        pending: (ms ?? []).filter((m) => m.plan_id === p.id && m.status === "pending_payment").length,
      })),
    };
  });

export const adminSavePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const r = z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(40),
        description: z.string().trim().max(300),
        benefits: z.array(z.string().trim().min(1).max(120)).max(10),
        price: z.number().positive("Price must be more than 0").max(100_000),
        credits: z.number().int().min(1, "At least 1 delivery").max(60),
        validityDays: z.number().int().min(7).max(62),
        minBasket: z.number().min(0).max(100_000),
        maxCarryForward: z.number().int().min(0).max(60),
        zoneIds: z.array(z.string().uuid()),
        isActive: z.boolean(),
        isRecommended: z.boolean(),
      })
      .safeParse(d);
    if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Please check the plan details");
    return r.data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.benefits.some((b) => /unlimited/i.test(b)) || /unlimited/i.test(data.description))
      return fail("Plans can't be described as unlimited delivery.");
    const db = await admin();
    // Changes apply to new and renewed periods; periods already paid keep their original terms.
    const { error } = await db
      .from("membership_plans")
      .update({
        name: data.name,
        description: data.description || null,
        benefits: data.benefits,
        monthly_price: data.price,
        included_credits: data.credits,
        validity_days: data.validityDays,
        min_basket: data.minBasket,
        max_carry_forward: data.maxCarryForward,
        zone_ids: data.zoneIds,
        is_active: data.isActive,
        is_recommended: data.isRecommended,
      })
      .eq("id", data.id);
    if (error) return fail("Could not save the plan.");
    return { ok: true as const };
  });

/* ---------------- Subscriptions ---------------- */

export const adminListSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    await db.rpc("membership_refresh", { p_user: null as any });
    const [{ data: ms }, { data: pays }, { data: plans }, { data: cycles }] = await Promise.all([
      db.from("memberships").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("membership_payments").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("membership_plans").select("id, name"),
      db.from("membership_cycles").select("id, membership_id, status, period_end, credits_granted, credits_carried"),
    ]);
    const userIds = Array.from(new Set([...(ms ?? []).map((m) => m.user_id), ...(pays ?? []).map((p) => p.user_id)]));
    const [{ data: profiles }, { data: ledger }, { data: orders }] = await Promise.all([
      userIds.length ? db.from("profiles").select("id, full_name, phone").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      db.from("membership_credit_ledger").select("cycle_id, delta"),
      db.from("orders").select("membership_cycle_id, membership_credit_status").not("membership_cycle_id", "is", null),
    ]);
    const emails = new Map<string, string>();
    await Promise.all(
      userIds.slice(0, 200).map(async (id) => {
        const { data } = await db.auth.admin.getUserById(id);
        if (data.user?.email) emails.set(id, data.user.email);
      }),
    );
    const who = (id: string) => {
      const p = profiles?.find((x: any) => x.id === id);
      return { name: p?.full_name || "Customer", phone: p?.phone || "", email: emails.get(id) ?? "" };
    };
    const planName = (id: string) => plans?.find((p) => p.id === id)?.name ?? "Plan";
    const avail = (cycleId: string | null) =>
      cycleId ? Math.max(0, (ledger ?? []).filter((l) => l.cycle_id === cycleId).reduce((s, l) => s + l.delta, 0)) : 0;
    return {
      memberships: (ms ?? []).map((m) => {
        const cyc = cycles?.find((c) => c.id === m.current_cycle_id);
        const os = (orders ?? []).filter((o) => o.membership_cycle_id === m.current_cycle_id);
        return {
          id: m.id,
          userId: m.user_id,
          customer: who(m.user_id),
          plan: planName(m.plan_id),
          status: m.status,
          periodStart: m.current_period_start,
          periodEnd: m.current_period_end,
          cancelAtPeriodEnd: m.cancel_at_period_end,
          cycleId: m.current_cycle_id,
          granted: cyc ? cyc.credits_granted + cyc.credits_carried : 0,
          available: avail(m.current_cycle_id),
          used: os.filter((o) => o.membership_credit_status === "consumed").length,
          held: os.filter((o) => o.membership_credit_status === "reserved").length,
          renewalScheduled: (cycles ?? []).some((c) => c.membership_id === m.id && c.status === "scheduled"),
          createdAt: m.created_at,
        };
      }),
      payments: (pays ?? []).map((p) => ({
        id: p.id,
        membershipId: p.membership_id,
        customer: who(p.user_id),
        plan: planName(p.plan_id),
        kind: p.kind,
        amount: Number(p.amount),
        status: p.status,
        method: p.method,
        reference: p.provider_reference,
        createdAt: p.created_at,
        paidAt: p.paid_at,
        note: p.note,
      })),
    };
  });

const PAY_ERRORS: Record<string, string> = {
  PAYMENT_NOT_PENDING: "This payment was already handled.",
  MEMBERSHIP_NOT_PAYABLE: "This subscription can't take this payment any more (it may be cancelled or suspended).",
  BAD_STATUS: "That action isn't possible for this subscription's current status.",
  PERIOD_ENDED: "The billing period has already ended. Ask the customer to purchase a new month.",
  BALANCE_BELOW_ZERO: "Credits can't go below zero.",
  CYCLE_NOT_OPEN: "This billing period is closed.",
  BAD_ADJUSTMENT: "Adjust by 1 to 50 credits.",
  duplicate: "That payment reference was already used.",
};
const mapErr = (msg: string) => {
  const k = Object.keys(PAY_ERRORS).find((x) => msg.includes(x));
  return k ? PAY_ERRORS[k]! : "Something went wrong. Please try again.";
};

export const adminConfirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        method: z.enum(["cash", "bank_transfer", "easypaisa", "jazzcash", "card"]),
        reference: z.string().trim().max(80).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.rpc("membership_record_payment", {
      p_payment: data.paymentId,
      p_method: data.method,
      p_reference: data.reference,
      p_actor: context.userId,
    });
    if (error) {
      console.error("record payment failed", error);
      return fail(mapErr(error.message));
    }
    return { ok: true as const };
  });

export const adminRejectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ paymentId: z.string().uuid(), note: z.string().trim().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: row, error } = await db
      .from("membership_payments")
      .update({ status: "failed", note: data.note || "Payment not received", recorded_by: context.userId })
      .eq("id", data.paymentId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error || !row) return fail("This payment was already handled.");
    return { ok: true as const };
  });

export const adminSubscriptionAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        membershipId: z.string().uuid(),
        action: z.enum(["suspend", "reactivate", "cancel", "cancel_at_period_end"]),
        note: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.rpc("membership_set_status", {
      p_membership: data.membershipId,
      p_action: data.action,
      p_actor: context.userId,
      p_note: data.note ?? null,
    } as any);
    if (error) return fail(mapErr(error.message));
    return { ok: true as const };
  });

export const adminAdjustCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cycleId: z.string().uuid(), delta: z.number().int(), note: z.string().trim().min(3, "Add a reason").max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.rpc("membership_adjust_credits", {
      p_cycle: data.cycleId,
      p_delta: data.delta,
      p_note: data.note,
      p_actor: context.userId,
    });
    if (error) return fail(mapErr(error.message));
    return { ok: true as const };
  });

/* ---------------- Settings ---------------- */

export const SETTINGS_KEYS = [
  "membership_enabled",
  "membership_payment_instructions",
  "membership_restore_credit_on_refund",
  "support_phone",
  "whatsapp_number",
  "support_email",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "catalog_is_sample",
] as const;

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("store_settings").select("key, value");
    return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value ?? ""])) as Record<string, string>;
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ values: z.record(z.enum(SETTINGS_KEYS), z.string().max(1000)) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = Object.entries(data.values).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    const { error } = await context.supabase.from("store_settings").upsert(rows, { onConflict: "key" });
    if (error) return fail("Could not save settings.");
    return { ok: true as const };
  });

export const adminCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("categories").select("id, name, is_active").order("sort_order");
    return data ?? [];
  });
