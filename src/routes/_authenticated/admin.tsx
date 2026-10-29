import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { CreditCard, Crown, Users, LayoutDashboard, Package, Settings, ShieldAlert, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("Admin", "SabTk store admin panel.", { noindex: true }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    return { isAdmin: data === true };
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/circle", label: "Ration Circle", icon: Users },
  { to: "/admin/plans", label: "Delivery Plans", icon: Crown },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const { isAdmin } = Route.useRouteContext();
  if (!isAdmin) {
    return (
      <div className="container-page grid min-h-[50vh] place-items-center py-16 text-center">
        <div className="max-w-sm space-y-3">
          <ShieldAlert className="mx-auto size-10 text-destructive" />
          <h1 className="text-2xl font-bold">Admins only</h1>
          <p className="text-sm text-muted-foreground">This account doesn't have admin access.</p>
          <Link to="/" className="font-semibold text-primary underline">Back to the shop</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[220px_1fr]">
      <aside>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Store admin</div>
        <nav className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n }}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:font-semibold data-[status=active]:text-secondary-foreground"
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
