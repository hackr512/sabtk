import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Store } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";

/**
 * Admin-only mode switcher. Shows "Switch to Admin" on the storefront and
 * "Switch to Store" inside the admin workspace. Invisible to everyone else.
 */
export function ModeSwitcher({ className }: { className?: string }) {
  const isAdmin = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!isAdmin) return null;

  const inAdmin = pathname.startsWith("/admin");
  return (
    <Link
      to={inAdmin ? "/" : "/admin"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20",
        className,
      )}
    >
      {inAdmin ? <Store className="size-4" /> : <LayoutDashboard className="size-4" />}
      <span className="hidden sm:inline">{inAdmin ? "Switch to Store" : "Switch to Admin"}</span>
    </Link>
  );
}
