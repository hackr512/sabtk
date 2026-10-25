import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="12" className="fill-primary" />
      <path
        d="M11 17.5h18l-1.6 11.2a3 3 0 0 1-3 2.6h-8.8a3 3 0 0 1-3-2.6L11 17.5Z"
        className="fill-primary-foreground"
      />
      <path d="M15.5 17.5c0-3 2-5.2 4.5-5.2s4.5 2.2 4.5 5.2" className="stroke-primary-foreground" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M22.6 9.2c2.9-.5 5.1.4 6.1 2.4-2.6 1.3-5 .8-6.1-2.4Z" className="fill-lime" />
      <circle cx="20" cy="24" r="2.3" className="fill-loyalty" />
    </svg>
  );
}

export function Logo({ showSlogan = true, className }: { showSlogan?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 shrink-0", className)} aria-label="SabTk home">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
          Sab<span className="text-primary">Tk</span>
        </span>
        {showSlogan && (
          <span className="mt-0.5 hidden text-[11px] font-medium text-muted-foreground lg:block">
            Har Ghar Ki Grocery, Aasaan Delivery.
          </span>
        )}
      </span>
    </Link>
  );
}
