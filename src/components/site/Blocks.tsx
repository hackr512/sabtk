import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  action?: { label: string; to: string; search?: Record<string, unknown> };
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && (
          <div className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</div>
        )}
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">{subtitle}</p>}
      </div>
      {action && (
        <Link
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={action.to as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          search={action.search as any}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {action.label} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-surface">
      <div className="container-page py-8 md:py-12">
        {eyebrow && <div className="mb-2 text-xs font-medium text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-3xl font-extrabold md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground md:text-lg">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warning" | "loyalty";
  children: ReactNode;
  className?: string;
}) {
  const cls =
    tone === "warning"
      ? "bg-warning-soft text-foreground border-warning/30"
      : tone === "loyalty"
        ? "bg-loyalty-soft text-foreground border-loyalty/20"
        : "bg-primary-soft text-foreground border-primary/20";
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", cls, className)}>{children}</div>;
}

export function LoadingGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-3">
          <div className="aspect-square animate-pulse rounded-xl bg-muted" />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
