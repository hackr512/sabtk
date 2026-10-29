import type { ReactNode } from "react";
import { toast } from "sonner";

export function AdminTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card-surface p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** Shows a toast for a server result ({ ok, error?, message? }) and returns whether it succeeded. */
export function report(r: { ok: boolean; error?: string; message?: string }, success = "Saved") {
  if (r.ok) toast.success(r.message ?? success);
  else toast.error(r.error ?? "Something went wrong");
  return r.ok;
}

export function reportError(e: unknown) {
  toast.error(e instanceof Error ? e.message : "Something went wrong");
}
