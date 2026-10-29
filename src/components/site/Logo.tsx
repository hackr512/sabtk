import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/sabtk-logo.png.asset.json";
import iconAsset from "@/assets/sabtk-icon.png.asset.json";

/** Full brand lockup: cart mark + "SabTk" + "Sab Khuch SabTK" tagline. */
export const LOGO_URL = logoAsset.url;
export const LOGO_ICON_URL = iconAsset.url;
export const SLOGAN = "Sab Khuch SabTk, Everything to Everyone";

export function LogoMark({ className }: { className?: string }) {
  return <img src={iconAsset.url} alt="" aria-hidden className={cn("h-9 w-auto shrink-0", className)} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex shrink-0 items-center gap-2.5", className)} aria-label="SabTk home">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
          Sab<span className="text-primary">Tk</span>
        </span>
      </span>
    </Link>
  );
}
