import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { AreaProvider } from "@/hooks/use-area";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileNav } from "@/components/site/MobileNav";
import { Maintenance } from "@/components/site/Maintenance";
import { useIsAdmin } from "@/hooks/use-admin";
import { storeConfigQuery } from "@/lib/queries";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context, location }) => {
    // ?maint=off lets the store team through the maintenance page and sets a cookie.
    const bypass = /(?:^|[&?])maint=off(?:&|$)/.test(location.searchStr ?? "");
    return context.queryClient
      .ensureQueryData(storeConfigQuery)
      .then((config) => ({ config, bypass }));
  },
  head: ({ loaderData }) => {
    const maintenance = loaderData?.config.settings["maintenance_mode"] === "true";
    return {
      meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1f4d33" },
      maintenance
        ? { title: "SabTk — We'll be right back" }
        : { title: "SabTk — Sab Khuch SabTk, Everything to Everyone" },
      {
        name: "description",
        content: maintenance
          ? "SabTk is briefly offline for maintenance. Your cart, rewards points and delivery plans are safe."
          : "Sab Khuch SabTk, Everything to Everyone. Grocery delivery in Islamabad and Rawalpindi with monthly ration planning and rewards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(maintenance ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png" },
      { rel: "apple-touch-icon", type: "image/png", href: "/favicon.png" },
    ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Apply the saved theme before first paint; dark is the default.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sabtk-theme');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){}",
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { config, bypass } = Route.useLoaderData();
  const maintenance = config.settings["maintenance_mode"] === "true";
  // The admin workspace has its own full-screen layout — no storefront chrome.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AreaProvider>
          <CartProvider>
            <SiteGate maintenance={maintenance} bypass={bypass} settings={config.settings}>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
              >
                Skip to content
              </a>
              {!isAdminRoute && <Header />}
              <main id="main" className={isAdminRoute ? undefined : "min-h-[60vh]"}>
                <Outlet />
              </main>
              {!isAdminRoute && <Footer />}
              {!isAdminRoute && <MobileNav />}
            </SiteGate>
            <Toaster position="top-center" richColors />
          </CartProvider>
        </AreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Hides the storefront while maintenance mode is on. Signed-in admins and
 * visitors who arrived with ?maint=off (stored as a cookie) still get through.
 */
function SiteGate({
  maintenance,
  bypass,
  settings,
  children,
}: {
  maintenance: boolean;
  bypass: boolean;
  settings: Record<string, string>;
  children: ReactNode;
}) {
  const isAdmin = useIsAdmin();
  const [cookieBypass, setCookieBypass] = useState(false);

  useEffect(() => {
    if (bypass) {
      document.cookie = "sabtk_maint=off; path=/; max-age=2592000; SameSite=Lax";
      return;
    }
    setCookieBypass(/(?:^|;\s*)sabtk_maint=off\b/.test(document.cookie));
  }, [bypass]);

  if (maintenance && !bypass && !cookieBypass && !isAdmin) {
    return <Maintenance settings={settings} />;
  }
  return <>{children}</>;
}
