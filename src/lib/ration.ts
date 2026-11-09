import type { Bundle } from "./types";

export type RationTier = "basic" | "standard" | "premium";
export type RationSize = "small" | "medium" | "large";

export const RATION_SIZES: { id: RationSize; label: string; people: string }[] = [
  { id: "small", label: "Small Family", people: "1–2 people" },
  { id: "medium", label: "Medium Family", people: "3–5 people" },
  { id: "large", label: "Large Family", people: "6+ people" },
];

export const RATION_TIERS: RationTier[] = ["basic", "standard", "premium"];

export const TIER_META: Record<
  RationTier,
  { name: string; badge: string; quality: string; blurb: string }
> = {
  basic: {
    name: "Basic",
    badge: "Budget Friendly",
    quality: "Good Quality Products",
    blurb: "Affordable everyday brands — good quality at the lowest monthly cost.",
  },
  standard: {
    name: "Standard",
    badge: "Popular Choice",
    quality: "Better Quality Products",
    blurb: "Established brands and better quality — a balanced monthly basket.",
  },
  premium: {
    name: "Premium",
    badge: "Premium Quality",
    quality: "Excellent Quality Products",
    blurb: "Premium brands and excellent quality — the best of everything, every month.",
  },
};

/** Bundle slugs follow `<tier>-<size>`; size comes from the suffix. */
export function bundleSize(b: Bundle): RationSize {
  if (b.slug.endsWith("-large")) return "large";
  if (b.slug.endsWith("-medium")) return "medium";
  return "small";
}

export function findBundle(bundles: Bundle[], size: RationSize, tier: RationTier): Bundle | undefined {
  return bundles.find((b) => b.tier === tier && bundleSize(b) === size);
}
