import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Sparkles, Truck, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { usePointsBalance } from "@/hooks/use-customer";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, formatPKR } from "@/lib/pricing";
import { storeConfigQuery } from "@/lib/queries";
import { AreaPicker } from "./AreaPicker";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/ration", label: "Monthly Ration" },
  { to: "/ration-circle", label: "Ration Circle" },
  { to: "/budget", label: "GharBudget" },
  { to: "/offers", label: "Offers" },
  { to: "/orders", label: "My Orders" },
] as const;

export function Header() {
  const { user } = useAuth();
  const cart = useCart();
  const points = usePointsBalance();
  const { data: config } = useQuery(storeConfigQuery);
  const isSample = config?.settings["catalog_is_sample"] === "true";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="bg-deep text-deep-foreground">
        <div className="container-page flex h-8 items-center justify-center gap-2 text-[11px] font-medium md:justify-between md:text-xs">
          <span className="flex items-center gap-1.5">
            <Truck className="size-3.5 text-lime" />
            Free delivery on orders of {formatPKR(FREE_DELIVERY_THRESHOLD)}+ · {formatPKR(DELIVERY_FEE)} below that
          </span>
          <span className="hidden md:inline">
            {isSample ? "Preview catalogue — prices shown are placeholders" : "Islamabad & Rawalpindi"}
          </span>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-3 md:h-[72px] md:gap-5">
        <Logo />
        <div className="hidden md:block">
          <AreaPicker />
        </div>
        <SearchBar className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            to="/rewards"
            className="hidden items-center gap-1.5 rounded-full bg-loyalty-soft px-3 py-2 text-sm font-semibold text-loyalty hover:brightness-95 sm:inline-flex"
          >
            <Sparkles className="size-4" />
            {user && points.data != null ? `${points.data} pts` : "Rewards"}
          </Link>
          <Link
            to="/account"
            className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted"
            aria-label={user ? "My account" : "Sign in"}
          >
            <User className="size-5" />
          </Link>
          <Link
            to="/cart"
            className="relative flex items-center gap-2 rounded-full bg-primary py-2 pl-3 pr-4 text-primary-foreground hover:bg-primary/90"
            aria-label={`Cart, ${cart.count} items, ${formatPKR(cart.totals.subtotal)}`}
          >
            <ShoppingBag className="size-5" />
            <span className="hidden text-sm font-bold sm:inline">{formatPKR(cart.totals.subtotal)}</span>
            {cart.count > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-lime px-1 text-[11px] font-extrabold text-lime-foreground">
                {cart.count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="container-page flex items-center gap-2 pb-3 md:hidden">
        <SearchBar className="flex-1" />
      </div>
      <div className="container-page -mt-1 pb-2 md:hidden">
        <AreaPicker compact />
      </div>

      <nav aria-label="Main" className="hidden border-t border-border md:block">
        <div className="container-page flex h-11 items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:font-semibold data-[status=active]:text-secondary-foreground"
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
