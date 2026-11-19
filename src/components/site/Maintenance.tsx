import { useEffect } from "react";
import { LogoMark, SLOGAN } from "@/components/site/Logo";

/**
 * Store-wide maintenance screen. Rendered instead of the storefront when the
 * `maintenance_mode` store setting is on. Uses only theme tokens so it matches
 * both the dark and light themes.
 */
export function Maintenance({ settings }: { settings: Record<string, string> }) {
  const message = settings["maintenance_message"]?.trim();
  const until = settings["maintenance_until"]?.trim();

  // Each page carries its own browser-tab title; during maintenance they all say the same thing.
  useEffect(() => {
    document.title = "SabTk — We'll be right back";
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-primary/5"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-xl text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <LogoMark className="h-14" />
          <span className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Sab<span className="text-primary">Tk</span>
          </span>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/80">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Under maintenance
        </span>

        <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
          We&rsquo;re upgrading your shopping experience
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          SabTk is briefly offline while we make things better. Your cart, rewards points and
          delivery plans are safe — please check back shortly.
        </p>

        {message && (
          <p className="mx-auto mt-6 max-w-md rounded-2xl border border-border bg-card px-5 py-4 text-sm leading-relaxed text-foreground">
            {message}
          </p>
        )}

        {until && (
          <p className="mt-5 text-sm font-semibold text-foreground">
            Back online: <span className="text-primary">{until}</span>
          </p>
        )}

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-9 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/60 underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Try again
        </button>

        <p className="mt-10 text-xs font-medium tracking-wide text-muted-foreground">{SLOGAN}</p>
      </div>
    </div>
  );
}
