export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  categoryId: string;
  categorySlug: string | null;
  categoryName: string | null;
  packSize: string;
  unit: string | null;
  unitQuantity: number | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  maxPerOrder: number;
  image: string | null;
  pointsEligible: boolean;
  createdAt: string;
};

export type ProductDetail = Product & {
  images: string[];
  sku: string | null;
  description: string | null;
  ingredients: string | null;
  nutrition: string | null;
  storageInstructions: string | null;
  expiryInfo: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  description: string | null;
};

export type Zone = { id: string; city: "Islamabad" | "Rawalpindi" | string; area: string };
export type DeliveryWindow = { id: string; label: string; startTime: string; endTime: string };
export type Reward = {
  id: string;
  name: string;
  description: string | null;
  pointsRequired: number;
  productId: string | null;
};

export type StoreConfig = {
  categories: Category[];
  zones: Zone[];
  windows: DeliveryWindow[];
  rewards: Reward[];
  settings: Record<string, string>;
  brands: string[];
};

export type Bundle = {
  id: string;
  slug: string;
  name: string;
  householdLabel: string;
  description: string | null;
  items: { product: Product; quantity: number }[];
};

export type CampaignStatus =
  | "collecting"
  | "goal_reached"
  | "confirming_supplier"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "completed";

export type Campaign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  product: Product;
  price: number;
  priceIsConfirmed: boolean;
  minQuantity: number;
  maxPerUser: number;
  deadline: string;
  deliveryWindowText: string;
  status: CampaignStatus;
  paymentRule: string;
  failurePolicy: string;
  committedQuantity: number;
  participantCount: number;
};

export type ShopFilters = {
  q?: string;
  category?: string;
  brands?: string[];
  min?: number;
  max?: number;
  inStock?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  page?: number;
};
