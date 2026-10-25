import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./public-client.server";
import { mapProduct, mapProductDetail, PRODUCT_COLUMNS, PRODUCT_DETAIL_COLUMNS } from "./mappers";
import { pricePerBaseUnit } from "./pricing";
import type { Bundle, Campaign, Product, StoreConfig } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const getStoreConfig = createServerFn({ method: "GET" }).handler(async (): Promise<StoreConfig> => {
  const db = createPublicClient();
  const [cats, zones, windows, rewards, settings, brands] = await Promise.all([
    db.from("categories").select("id, slug, name, image_url, description").eq("is_active", true).order("sort_order"),
    db.from("delivery_zones").select("id, city, area").eq("is_active", true).order("sort_order"),
    db.from("delivery_windows").select("id, label, start_time, end_time").eq("is_active", true).order("sort_order"),
    db.from("rewards").select("id, name, description, points_required, product_id").eq("is_active", true).order("sort_order"),
    db.from("store_settings").select("key, value"),
    db.from("products").select("brand").eq("is_active", true).not("brand", "is", null),
  ]);
  const err = cats.error || zones.error || windows.error || rewards.error || settings.error;
  if (err) {
    console.error("getStoreConfig", err);
    throw new Error("Could not load store settings");
  }
  return {
    categories: (cats.data ?? []).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      image: c.image_url,
      description: c.description,
    })),
    zones: (zones.data ?? []).map((z) => ({ id: z.id, city: z.city, area: z.area })),
    windows: (windows.data ?? []).map((w) => ({
      id: w.id,
      label: w.label,
      startTime: w.start_time,
      endTime: w.end_time,
    })),
    rewards: (rewards.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      pointsRequired: r.points_required,
      productId: r.product_id,
    })),
    settings: Object.fromEntries((settings.data ?? []).map((s) => [s.key, s.value ?? ""])),
    brands: Array.from(new Set((brands.data ?? []).map((b) => b.brand as string))).sort(),
  };
});

const filtersSchema = z.object({
  q: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  brands: z.array(z.string().max(80)).max(20).optional(),
  min: z.number().min(0).optional(),
  max: z.number().min(0).optional(),
  inStock: z.boolean().optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).optional(),
  page: z.number().int().min(1).max(500).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
});

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => filtersSchema.parse(d))
  .handler(async ({ data }) => {
    const db = createPublicClient();
    const pageSize = data.pageSize ?? 24;
    const page = data.page ?? 1;
    const { data: rows, error } = await db.rpc("search_products", {
      p_q: data.q || undefined,
      p_category: data.category || undefined,
      p_brands: data.brands?.length ? data.brands : undefined,
      p_min: data.min,
      p_max: data.max,
      p_in_stock: data.inStock ?? false,
      p_sort: data.sort ?? "relevance",
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    });
    if (error) {
      console.error("searchProducts", error);
      throw new Error("Search is unavailable right now");
    }
    const items = (rows ?? []).map((r: any) => mapProduct(r));
    const total = rows?.[0]?.total_count ? Number(rows[0].total_count) : 0;
    return { items, total, page, pageSize };
  });

export const getProductsByIds = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(100) }).parse(d))
  .handler(async ({ data }): Promise<Product[]> => {
    if (data.ids.length === 0) return [];
    const db = createPublicClient();
    const { data: rows, error } = await db.from("products").select(PRODUCT_COLUMNS).in("id", data.ids);
    if (error) throw new Error("Could not load products");
    return (rows ?? []).map((r: any) => mapProduct(r));
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const db = createPublicClient();
    const { data: row, error } = await db
      .from("products")
      .select(PRODUCT_DETAIL_COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error("Could not load product");
    if (!row) return null;
    const product = mapProductDetail(row as any);

    const [related, together] = await Promise.all([
      db
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("category_id", product.categoryId)
        .eq("is_active", true)
        .neq("id", product.id)
        .order("is_featured", { ascending: false })
        .limit(8),
      db.rpc("frequently_bought_with", { p_product: product.id, p_limit: 6 }),
    ]);
    const relatedItems = (related.data ?? []).map((r: any) => mapProduct(r));

    // Frequently bought together: real co-purchases first; otherwise items that share a ration bundle.
    let togetherSource: "orders" | "bundles" | "none" = "none";
    let togetherIds: string[] = (together.data ?? []).map((t: any) => t.product_id);
    if (togetherIds.length > 0) {
      togetherSource = "orders";
    } else {
      const { data: bundleRows } = await db
        .from("ration_bundle_items")
        .select("bundle_id")
        .eq("product_id", product.id);
      const bundleIds = (bundleRows ?? []).map((b) => b.bundle_id);
      if (bundleIds.length) {
        const { data: mates } = await db
          .from("ration_bundle_items")
          .select("product_id")
          .in("bundle_id", bundleIds)
          .neq("product_id", product.id);
        togetherIds = Array.from(new Set((mates ?? []).map((m) => m.product_id))).slice(0, 6);
        if (togetherIds.length) togetherSource = "bundles";
      }
    }
    let togetherItems: Product[] = [];
    if (togetherIds.length) {
      const { data: rows } = await db
        .from("products")
        .select(PRODUCT_COLUMNS)
        .in("id", togetherIds)
        .eq("is_active", true);
      togetherItems = (rows ?? []).map((r: any) => mapProduct(r));
    }
    return {
      product,
      related: relatedItems.filter((p) => p.brand === product.brand || !product.brand).slice(0, 8),
      alternatives: relatedItems.filter((p) => product.brand && p.brand !== product.brand).slice(0, 8),
      together: togetherItems,
      togetherSource,
    };
  });

async function loadBundles(db: ReturnType<typeof createPublicClient>): Promise<Bundle[]> {
  const { data, error } = await db
    .from("ration_bundles")
    .select(`id, slug, name, household_label, description, ration_bundle_items(quantity, products(${PRODUCT_COLUMNS}))`)
    .eq("is_active", true)
    .order("sort_order");
  if (error) {
    console.error("loadBundles", error);
    return [];
  }
  return (data ?? []).map((b: any) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    householdLabel: b.household_label,
    description: b.description,
    items: (b.ration_bundle_items ?? [])
      .filter((i: any) => i.products)
      .map((i: any) => ({ quantity: i.quantity, product: mapProduct(i.products) })),
  }));
}

async function loadCampaigns(db: ReturnType<typeof createPublicClient>): Promise<Campaign[]> {
  const [{ data, error }, progress] = await Promise.all([
    db
      .from("campaigns")
      .select(`*, products(${PRODUCT_COLUMNS})`)
      .in("status", ["collecting", "goal_reached", "confirming_supplier", "confirmed"])
      .order("deadline"),
    db.rpc("campaign_progress"),
  ]);
  if (error) {
    console.error("loadCampaigns", error);
    return [];
  }
  const prog = new Map((progress.data ?? []).map((p: any) => [p.campaign_id, p]));
  return (data ?? [])
    .filter((c: any) => c.products)
    .map((c: any) => {
      const p: any = prog.get(c.id);
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        product: mapProduct(c.products),
        price: Number(c.price),
        priceIsConfirmed: c.price_is_confirmed,
        minQuantity: c.min_quantity,
        maxPerUser: c.max_per_user,
        deadline: c.deadline,
        deliveryWindowText: c.delivery_window_text,
        status: c.status,
        paymentRule: c.payment_rule,
        failurePolicy: c.failure_policy,
        committedQuantity: p ? Number(p.committed_quantity) : 0,
        participantCount: p ? Number(p.participant_count) : 0,
      };
    });
}

/** Best Value rule: lowest price per kg / L / piece within a category, among in-stock items with a comparable unit. */
function bestValue(products: Product[]): (Product & { valueNote: string })[] {
  const groups = new Map<string, { p: Product; v: number; base: string }[]>();
  for (const p of products) {
    if (p.stock <= 0) continue;
    const ppu = pricePerBaseUnit(p.price, p.unit, p.unitQuantity);
    if (!ppu) continue;
    const key = `${p.categoryId}:${ppu.base}`;
    const list = groups.get(key) ?? [];
    list.push({ p, v: ppu.value, base: ppu.base });
    groups.set(key, list);
  }
  const out: (Product & { valueNote: string })[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.v - b.v);
    const best = list[0]!;
    out.push({
      ...best.p,
      valueNote: `Lowest price per ${best.base} in ${best.p.categoryName ?? "its category"}`,
    });
  }
  return out;
}

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const db = createPublicClient();
  const [featured, offers, all, bundles, campaigns] = await Promise.all([
    db.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).eq("is_featured", true).order("name").limit(12),
    db.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).not("compare_at_price", "is", null).limit(12),
    db.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).limit(500),
    loadBundles(db),
    loadCampaigns(db),
  ]);
  const allItems = (all.data ?? []).map((r: any) => mapProduct(r));
  return {
    featured: (featured.data ?? []).map((r: any) => mapProduct(r)),
    offers: (offers.data ?? []).map((r: any) => mapProduct(r)).filter((p) => p.compareAtPrice),
    bestValue: bestValue(allItems).slice(0, 8),
    productCount: allItems.length,
    bundles,
    campaigns,
  };
});

export const getBundles = createServerFn({ method: "GET" }).handler(async () => {
  return loadBundles(createPublicClient());
});

export const getCampaigns = createServerFn({ method: "GET" }).handler(async () => {
  return loadCampaigns(createPublicClient());
});

export const getOffersData = createServerFn({ method: "GET" }).handler(async () => {
  const db = createPublicClient();
  const [offers, all, featured] = await Promise.all([
    db.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).not("compare_at_price", "is", null).limit(48),
    db.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).limit(500),
    db.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).eq("is_featured", true).limit(12),
  ]);
  const allItems = (all.data ?? []).map((r: any) => mapProduct(r));
  return {
    offers: (offers.data ?? []).map((r: any) => mapProduct(r)).filter((p) => p.compareAtPrice),
    bestValue: bestValue(allItems),
    essentials: (featured.data ?? []).map((r: any) => mapProduct(r)),
  };
});

/** Lightweight list of the whole active catalogue for the ration builder and GharBudget planner. */
export const getCatalogLite = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const db = createPublicClient();
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("name")
    .limit(1000);
  if (error) throw new Error("Could not load catalogue");
  return (data ?? []).map((r: any) => mapProduct(r));
});
