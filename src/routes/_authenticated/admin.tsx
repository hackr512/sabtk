import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Calculator,
  CreditCard,
  Crown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  ShoppingBasket,
  ShoppingCart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { OrderAlerts } from "@/components/admin/OrderAlerts";
import { ModeSwitcher } from "@/components/admin/ModeSwitcher";
import { LogoMark } from "@/components/site/Logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  { to: "/admin/ration", label: "Ration Plans", icon: ShoppingBasket },
  { to: "/admin/budget", label: "GharBudget", icon: Calculator },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/plans", label: "Delivery Plans", icon: Crown },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          activeOptions={{ exact: "exact" in n }}
          title={collapsed ? n.label : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-primary data-[status=active]:font-semibold data-[status=active]:text-primary-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <n.icon className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{n.label}</span>}
        </Link>
      ))}
    </nav>
  );
}

function AdminLayout() {
  const { isAdmin } = Route.useRouteContext();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
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
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center gap-2 border-b border-border px-4", collapsed && "justify-center px-0")}>
          <LogoMark className="h-8" />
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold">SabTk</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin Workspace</div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminNav collapsed={collapsed} />
        </div>
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:px-5">
          {/* Mobile drawer */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-lg text-foreground hover:bg-muted lg:hidden"
                aria-label="Open admin menu"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="flex h-14 flex-row items-center gap-2 border-b border-border px-4">
                <LogoMark className="h-8" />
                <SheetTitle className="text-sm font-bold">Admin Workspace</SheetTitle>
              </SheetHeader>
              <div className="p-3">
                <AdminNav onNavigate={() => setDrawerOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 lg:hidden">
            <LogoMark className="h-7" />
            <span className="text-sm font-bold">Admin Workspace</span>
          </div>
          <span className="hidden text-sm text-muted-foreground lg:inline">
            {NAV.find((n) => ("exact" in n ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? "Dashboard"}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              to="/admin/orders"
              className="grid size-9 place-items-center rounded-lg text-foreground hover:bg-muted"
              aria-label="Order notifications"
            >
              <Bell className="size-4" />
            </Link>
            <ModeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                  aria-label="Admin account menu"
                >
                  {(user?.email?.[0] ?? "A").toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account" className="cursor-pointer">My account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/" className="cursor-pointer">View store</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()} className="cursor-pointer text-destructive">
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </div>

      <OrderAlerts />
    </div>
  );
}
