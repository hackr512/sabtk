import { useState } from "react";
import { PlanCard } from "@/components/ration/BundleCard";
import { RATION_SIZES, RATION_TIERS, findBundle, type RationSize } from "@/lib/ration";
import type { Bundle } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Homepage Monthly Ration section: pick a family size, then compare the three quality plans. */
export function RationPlans({ bundles }: { bundles: Bundle[] }) {
  const [size, setSize] = useState<RationSize>("medium");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Family size">
        <span className="mr-1 text-sm font-semibold text-muted-foreground">Your family size:</span>
        {RATION_SIZES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSize(s.id)}
            aria-pressed={size === s.id}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              size === s.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/50",
            )}
          >
            {s.label} <span className="font-normal opacity-80">({s.people})</span>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {RATION_TIERS.map((tier) => {
          const bundle = findBundle(bundles, size, tier);
          return bundle ? <PlanCard key={bundle.id} bundle={bundle} /> : null;
        })}
      </div>
    </div>
  );
}
