import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  max,
  size = "default",
  className,
  label = "Quantity",
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
}) {
  const h = size === "sm" ? "h-8" : size === "lg" ? "h-12" : "h-10";
  const w = size === "sm" ? "w-8" : size === "lg" ? "w-12" : "w-10";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-full bg-primary text-primary-foreground", h, className)}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className={cn("grid place-items-center rounded-full hover:bg-primary-foreground/15", h, w)}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className={cn(
          "grid place-items-center rounded-full hover:bg-primary-foreground/15 disabled:opacity-40",
          h,
          w,
        )}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
