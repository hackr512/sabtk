import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Package, ShoppingBasket, User } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/ration", label: "Ration", icon: ShoppingBasket },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/account", label: "Account", icon: User },
] as const;

export function MobileNav() {
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
            >
              <span className="grid h-7 w-12 place-items-center rounded-full group-data-[status=active]:bg-secondary">
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
