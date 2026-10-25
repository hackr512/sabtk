import type { Product, ProductDetail } from "./types";

export const PRODUCT_COLUMNS =
  "id, slug, name, brand, category_id, pack_size, unit, unit_quantity, price, compare_at_price, stock_quantity, max_per_order, images, points_eligible, created_at, categories(slug, name)";

export const PRODUCT_DETAIL_COLUMNS = `${PRODUCT_COLUMNS}, sku, description, ingredients, nutrition, storage_instructions, expiry_info`;

type Row = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category_id: string;
  pack_size: string;
  unit: string | null;
  unit_quantity: number | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  max_per_order: number;
  images: string[];
  points_eligible: boolean;
  created_at: string;
  categories?: { slug: string; name: string } | null;
  category_slug?: string | null;
  category_name?: string | null;
};

export function mapProduct(r: Row): Product {
  const price = Number(r.price);
  const compare = r.compare_at_price != null ? Number(r.compare_at_price) : null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    categoryId: r.category_id,
    categorySlug: r.categories?.slug ?? r.category_slug ?? null,
    categoryName: r.categories?.name ?? r.category_name ?? null,
    packSize: r.pack_size,
    unit: r.unit,
    unitQuantity: r.unit_quantity != null ? Number(r.unit_quantity) : null,
    price,
    compareAtPrice: compare != null && compare > price ? compare : null,
    stock: r.stock_quantity,
    maxPerOrder: r.max_per_order,
    image: r.images?.[0] ?? null,
    pointsEligible: r.points_eligible,
    createdAt: r.created_at,
  };
}

type DetailRow = Row & {
  sku: string | null;
  description: string | null;
  ingredients: string | null;
  nutrition: string | null;
  storage_instructions: string | null;
  expiry_info: string | null;
};

export function mapProductDetail(r: DetailRow): ProductDetail {
  return {
    ...mapProduct(r),
    images: r.images ?? [],
    sku: r.sku,
    description: r.description,
    ingredients: r.ingredients,
    nutrition: r.nutrition,
    storageInstructions: r.storage_instructions,
    expiryInfo: r.expiry_info,
  };
}
