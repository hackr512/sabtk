import { queryOptions } from "@tanstack/react-query";
import {
  getBundles,
  getCampaigns,
  getCatalogLite,
  getHomeData,
  getOffersData,
  getProduct,
  getStoreConfig,
  searchProducts,
} from "./catalog.functions";
import type { ShopFilters } from "./types";

export const storeConfigQuery = queryOptions({
  queryKey: ["store-config"],
  queryFn: () => getStoreConfig(),
  staleTime: 5 * 60_000,
});

export const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
  staleTime: 60_000,
});

export const shopQuery = (f: ShopFilters) =>
  queryOptions({
    queryKey: ["shop", f],
    queryFn: () =>
      searchProducts({
        data: {
          q: f.q,
          category: f.category,
          brands: f.brands,
          min: f.min,
          max: f.max,
          inStock: f.inStock,
          sort: f.sort,
          page: f.page,
        },
      }),
    staleTime: 30_000,
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProduct({ data: { slug } }),
    staleTime: 30_000,
  });

export const bundlesQuery = queryOptions({
  queryKey: ["bundles"],
  queryFn: () => getBundles(),
  staleTime: 60_000,
});

export const campaignsQuery = queryOptions({
  queryKey: ["campaigns"],
  queryFn: () => getCampaigns(),
  staleTime: 15_000,
});

export const offersQuery = queryOptions({
  queryKey: ["offers"],
  queryFn: () => getOffersData(),
  staleTime: 60_000,
});

export const catalogLiteQuery = queryOptions({
  queryKey: ["catalog-lite"],
  queryFn: () => getCatalogLite(),
  staleTime: 60_000,
});
