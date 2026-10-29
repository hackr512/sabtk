import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  Calculator,
  CalendarClock,
  Gift,
  LayoutGrid,
  PackageOpen,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/circle/CampaignCard";
import { BundleCard, bundleTotals } from "@/components/ration/BundleCard";
import { ProductRail } from "@/components/shop/ProductCard";
import { RecentlyViewed, ReorderEssentials } from "@/components/shop/Recommendations";
import { EmptyState, SectionHeader } from "@/components/site/Blocks";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import {
  DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  REFERRAL_POINTS,
  RUPEES_PER_POINT,
  formatPKR,
} from "@/lib/pricing";
import { homeQuery, storeConfigQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  head: () => ({
    meta: [
      { title: "SabTk — Sab Khuch SabTk, Everything to Everyone" },
      {
        name: "description",
        content:
          "Order daily groceries, plan your monthly ration and manage your household budget with SabTk delivery in Islamabad and Rawalpindi.",
      },
      { property: "og:title", content: "SabTk — Sab Khuch SabTk, Everything to Everyone" },
      {
        property: "og:description",
        content: "Groceries, monthly ration bundles, neighbourhood group buying and rewards in Islamabad & Rawalpindi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: home } = useSuspenseQuery(homeQuery);
  const { data: config } = useQuery(storeConfigQuery);
  const categories = config?.categories ?? [];
  const sugarReward = config?.rewards[0];

  return (
    <div className="pb-6">
      <Hero firstWindow={config?.windows[0]?.label} />

      <FeatureStrip />

      {/* B. Categories */}
      <section className="container-page mt-14" aria-labelledby="cats">
        <SectionHeader
          eyebrow="Shop by category"
          title={<span id="cats">Everything your kitchen needs</span>}
          action={{ label: "All categories", to: "/categories" }}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="group flex flex-col items-center rounded-lg p-2 text-center transition hover:bg-surface"
            >
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface">
                {c.image && (
                  <img
                    src={c.image}
                    alt=""
                    loading="lazy"
                    width={240}
                    height={240}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <span className="mt-2 line-clamp-2 min-h-[2.5em] text-xs font-semibold leading-tight sm:text-sm">
                {c.name}
              </span>
            </Link>
          ))}
          <Link
            to="/shop"
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3 text-center text-foreground transition hover:bg-accent"
          >
            <LayoutGrid className="size-7 text-lime" />
            <span className="text-sm font-bold">Browse all products</span>
          </Link>
        </div>
      </section>

      {/* C. Everyday essentials */}
      <section className="container-page mt-14">
        <SectionHeader
          eyebrow="Rozmarra ki zaroorat"
          title="Everyday Essentials"
          subtitle="Staples our team keeps stocked for daily cooking."
          action={{ label: "Shop all", to: "/shop" }}
        />
        {home.productCount === 0 ? (
          <EmptyState icon={PackageOpen} title="The catalogue is being stocked">
            No products have been added yet. Store administrators can add categories and products from the
            store database — they'll appear here automatically.
          </EmptyState>
        ) : home.featured.length ? (
          <ProductRail products={home.featured} />
        ) : (
          <EmptyState icon={PackageOpen} title="No essentials picked yet">
            Mark products as featured in the store database to show them here.
          </EmptyState>
        )}
      </section>

      {/* D. Monthly Ration */}
      <section className="mt-16 bg-secondary/60 py-14">
        <div className="container-page">
          <SectionHeader
            eyebrow="Monthly Ration"
            title="A well-stocked home, all month."
            subtitle="Monthly baskets for your household, at today’s prices."
            action={{ label: "Build my ration", to: "/ration" }}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {home.bundles.map((b, i) => (
              <BundleCard key={b.id} bundle={b} highlight={i === 1} />
            ))}
            <article className="flex flex-col justify-between rounded-lg border border-border bg-card p-5">
              <div>
                <div className="grid size-11 place-items-center rounded-full bg-lime text-lime-foreground">
                  <ShoppingBasket className="size-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold">Customize My Ration</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start from a bundle or a blank list. Change quantities, swap brands and see the live total
                  before adding to cart.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/ration">
                  Start customizing <ArrowRight />
                </Link>
              </Button>
            </article>
          </div>
        </div>
      </section>

      {/* E. Ration Circle */}
      <section className="relative overflow-hidden border-y border-border bg-deep py-16 text-deep-foreground">
        <div className="container-page relative grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-xs font-bold text-lime-foreground">
              <Users className="size-3.5" /> Ration Circle
            </span>
            <h2 className="mt-4 text-3xl font-semibold md:text-4xl">Neighbourhood group buying</h2>
            <p className="mt-3 text-deep-foreground/80 md:text-lg">
              A shared basket. A better bulk deal. Join households in your neighbourhood.
            </p>
            <ol className="mt-6 space-y-3">
              {[
                ["Reserve", "Pick a campaign and reserve your packs. No advance payment."],
                ["Reach the goal", "When enough households join, we request a bulk rate from the supplier."],
                ["Get it delivered", "Once confirmed, pay cash on delivery. If the goal isn't met, your reservation is released."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-deep-foreground/10 text-sm font-bold text-lime">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-semibold">{t}</span>
                    <span className="block text-sm text-deep-foreground/70">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Button asChild variant="lime" className="mt-7">
              <Link to="/ration-circle">
                See all campaigns <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {home.campaigns.slice(0, 2).map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
            {home.campaigns.length === 0 && (
              <div className="rounded-2xl border border-deep-foreground/20 p-8 text-center md:col-span-2">
                <Users className="mx-auto size-8 text-lime" />
                <p className="mt-3 font-semibold">No group-buy campaigns are open right now.</p>
                <p className="mt-1 text-sm text-deep-foreground/70">New campaigns will appear here as soon as they open.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* F. GharBudget */}
      <BudgetTeaser mediumTotal={home.bundles[1] ? bundleTotals(home.bundles[1]).total : null} mediumName={home.bundles[1]?.name} />

      {/* G. Offers and recommendations */}
      {home.offers.length > 0 && (
        <section className="container-page mt-14">
          <SectionHeader eyebrow="Aaj ki deals" title="Today's Offers" action={{ label: "All offers", to: "/offers" }} />
          <ProductRail products={home.offers} />
        </section>
      )}

      {home.bestValue.length > 0 && (
        <section className="container-page mt-14">
          <SectionHeader
            eyebrow="Smart picks"
            title="Best Value Packs"
            subtitle="The lowest price per kg, litre or piece in each category, worked out from current prices."
            action={{ label: "More value picks", to: "/offers" }}
          />
          <ProductRail
            products={home.bestValue}
            notes={Object.fromEntries(home.bestValue.map((p) => [p.id, p.valueNote]))}
          />
        </section>
      )}

      <ReorderEssentials />
      <RecentlyViewed />

      {/* H. Loyalty */}
      <section className="mt-16 py-6">
        <div className="container-page">
          <div className="relative isolate grid gap-8 overflow-hidden rounded-[2rem] bg-loyalty p-8 text-loyalty-foreground md:grid-cols-[1.2fr_1fr] md:items-center md:p-12">
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 -z-10 size-72 rounded-full bg-loyalty-foreground/10" />
            <span aria-hidden className="pointer-events-none absolute -bottom-24 right-1/4 -z-10 size-56 rounded-full bg-loyalty-foreground/10" />
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-loyalty-foreground/15 text-loyalty-foreground px-3 py-1 text-xs font-bold">
                <Sparkles className="size-3.5" /> SabTk Rewards
              </span>
              <h2 className="mt-4 text-3xl font-semibold md:text-5xl">Har order pe points, har mahinay faida.</h2>
              <p className="mt-3 max-w-lg text-loyalty-foreground/85">
                Earn 1 point for every {formatPKR(RUPEES_PER_POINT)} of eligible groceries, credited once your
                order is delivered. Invite friends and earn {REFERRAL_POINTS} points when their first delivered
                order is {formatPKR(FREE_DELIVERY_THRESHOLD)} or more.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="lime">
                  <Link to="/rewards">How rewards work</Link>
                </Button>
                <Button asChild variant="outline" className="border-loyalty-foreground/30 bg-loyalty-foreground/10 text-loyalty-foreground hover:bg-loyalty-foreground/20 hover:text-loyalty-foreground">
                  <Link to="/rewards">Invite a friend</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3">
              <RewardTile icon={Banknote} title={`1 point / ${formatPKR(RUPEES_PER_POINT)}`} text="On eligible delivered merchandise" />
              {sugarReward && (
                <RewardTile icon={Gift} title={`${sugarReward.pointsRequired} points`} text={`${sugarReward.name}, redeemable at checkout`} />
              )}
              <RewardTile icon={Users} title={`${REFERRAL_POINTS} points`} text="When a referred friend completes a qualifying first order" />
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />
    </div>
  );
}

function Hero({ firstWindow }: { firstWindow: string | undefined }) {
  return (
    <section aria-label="SabTk grocery delivery" className="relative">
      <HeroCarousel>
        <div className="container-page relative z-20 flex h-full flex-col justify-center pb-14 pt-8 sm:py-10">
          <div className="max-w-xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold text-deep-foreground/85">
              <span className="h-px w-8 bg-lime" /> ISLAMABAD & RAWALPINDI
            </p>
            <h1 className="text-6xl font-semibold leading-none text-deep-foreground sm:text-7xl">SabTk<span className="text-lime">.</span></h1>
            <p className="mt-5 max-w-md font-display text-2xl font-semibold leading-tight text-deep-foreground sm:text-4xl">
              Sab Khuch SabTk.<br />Everything to Everyone.
            </p>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-deep-foreground/80">
              Your daily essentials. Your monthly ration. Delivered to your doorstep.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="lime">
                <Link to="/shop">Shop groceries <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="on-deep">
                <Link to="/ration">Monthly ration</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-deep-foreground/85">
              <span className="inline-flex items-center gap-2"><Truck className="size-4 text-lime" /> Free delivery at {formatPKR(FREE_DELIVERY_THRESHOLD)}+</span>
              <span className="inline-flex items-center gap-2"><Banknote className="size-4 text-lime" /> Cash on delivery</span>
            </div>
            <div className="mt-2 text-xs text-deep-foreground/65">
              {formatPKR(DELIVERY_FEE)} delivery below {formatPKR(FREE_DELIVERY_THRESHOLD)}.
              {firstWindow && <span className="ml-2">Tomorrow: {firstWindow}</span>}
              <Link to="/delivery" className="ml-2 underline underline-offset-4">Details</Link>
            </div>
          </div>
        </div>
      </HeroCarousel>
    </section>
  );
}

function FeatureStrip() {
  const items = [
    { to: "/ration", icon: ShoppingBasket, title: "Monthly Ration", text: "Family-size baskets", tone: "bg-lime text-lime-foreground" },
    { to: "/ration-circle", icon: Users, title: "Ration Circle", text: "Buy with neighbours", tone: "bg-primary text-primary-foreground" },
    { to: "/budget", icon: Calculator, title: "GharBudget", text: "Plan & track spending", tone: "bg-loyalty text-loyalty-foreground" },
    { to: "/rewards", icon: Gift, title: "Rewards", text: "Points on every order", tone: "bg-secondary text-primary" },
  ] as const;
  return (
    <section className="border-b border-border">
      <div className="container-page grid grid-cols-2 gap-x-5 md:grid-cols-4">
        {items.map(({ to, icon: Icon, title, text, tone }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 border-b border-border py-5 transition hover:text-primary md:border-b-0 md:py-7"
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tone)}>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 leading-tight">
              <b className="block truncate text-sm md:text-base">{title}</b>
              <span className="block truncate text-xs text-muted-foreground">{text}</span>
            </span>
            <ArrowRight className="ml-auto hidden size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary md:block" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function BudgetTeaser({ mediumTotal, mediumName }: { mediumTotal: number | null; mediumName: string | undefined }) {
  const [amount, setAmount] = useState("40000");
  const [size, setSize] = useState("4");
  const navigate = useNavigate();
  const budget = Number(amount.replace(/\D/g, "")) || 0;
  const share = mediumTotal && budget > 0 ? Math.round((mediumTotal / budget) * 100) : null;

  return (
    <section className="mt-16 border-y border-border">
      <div className="container-page grid gap-8 py-14 lg:grid-cols-2">
        <div className="py-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-loyalty-soft px-3 py-1 text-xs font-bold text-loyalty">
            <Calculator className="size-3.5" /> GharBudget
          </span>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">A little planning. More peace of mind.</h2>
          <p className="mt-3 text-muted-foreground">
            Set a monthly budget, build your ration list, compare pack sizes and see your remaining budget before
            you check out. Track what you've actually spent each month.
          </p>
          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
            {[
              "Monthly budget in PKR",
              "Personal ration list",
              "Compare pack sizes",
              "Spending vs budget",
              "Repeat past baskets",
              "Optional reorder reminders",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-loyalty" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/budget", search: { amount: budget || undefined, size: Number(size) } });
            }}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="text-sm font-bold">Your monthly grocery budget</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Monthly grocery budget</span>
                <div className="mt-1 flex h-12 items-center rounded-xl border border-input bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="text-sm font-semibold text-muted-foreground">Rs.</span>
                  <input
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
                    className="h-full w-full bg-transparent px-2 text-lg font-bold outline-none"
                    aria-label="Monthly grocery budget in rupees"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Household</span>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "person" : "people"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {share != null && mediumTotal != null && (
              <div className="mt-5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{mediumName} at today's prices</span>
                  <span className="font-bold">{formatPKR(mediumTotal)}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", share > 100 ? "bg-destructive" : "bg-loyalty")}
                    style={{ width: `${Math.min(100, share)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {share > 100
                    ? `That basket is ${formatPKR(mediumTotal - budget)} over this budget.`
                    : `That's ${share}% of your budget, leaving ${formatPKR(budget - mediumTotal)} for everything else.`}
                </p>
              </div>
            )}
            <Button type="submit" variant="loyalty" className="mt-5 w-full">
              Start planning my month <ArrowRight />
            </Button>
          </form>
          <p className="mt-3 text-center text-xs text-muted-foreground">Sign in to save plans across devices.</p>
        </div>
      </div>
    </section>
  );
}

function RewardTile({ icon: Icon, title, text }: { icon: typeof Gift; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-loyalty-foreground/10 p-4 backdrop-blur-sm">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-lime-foreground">
        <Icon className="size-5" />
      </span>
      <span className="leading-tight">
        <b className="block">{title}</b>
        <span className="text-sm text-loyalty-foreground/85">{text}</span>
      </span>
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: Banknote, title: "Cash on Delivery", text: "Pay when your groceries arrive" },
    { icon: CalendarClock, title: "Choose your window", text: "Pick a delivery slot at checkout" },
    { icon: Truck, title: "Fees shown upfront", text: "Delivery fee shown before you order" },
    { icon: ShieldCheck, title: "Clear policies", text: "Easy cancellations & refunds" },
  ];
  return (
    <section className="container-page mt-14">
      <div className="grid grid-cols-2 gap-6 border-t border-border py-7 md:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="leading-tight">
              <b className="block text-sm">{title}</b>
              <span className="text-xs text-muted-foreground">{text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
