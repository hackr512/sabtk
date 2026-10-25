import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useArea } from "@/hooks/use-area";
import { storeConfigQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function useSelectedZone() {
  const { zoneId } = useArea();
  const { data } = useQuery(storeConfigQuery);
  return data?.zones.find((z) => z.id === zoneId) ?? null;
}

export function AreaPicker({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery(storeConfigQuery);
  const { zoneId, setZoneId } = useArea();
  const [open, setOpen] = useState(false);
  const zone = data?.zones.find((z) => z.id === zoneId);
  const [city, setCity] = useState<string>(zone?.city ?? "Islamabad");
  const firstWindow = data?.windows[0];
  const cities = ["Islamabad", "Rawalpindi"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-full text-left transition hover:bg-muted",
            compact ? "px-2 py-1" : "px-3 py-1.5",
          )}
          aria-label="Choose delivery area"
        >
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] text-muted-foreground">Deliver to</span>
            <span className="block truncate text-sm font-semibold">
              {zone ? `${zone.area}, ${zone.city}` : "Select your area"}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-2xl p-0">
        <div className="border-b border-border p-4">
          <div className="font-display text-base font-bold">Where should we deliver?</div>
          <p className="mt-1 text-xs text-muted-foreground">
            We currently deliver to the areas listed below in Islamabad and Rawalpindi.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={cn(
                  "rounded-full py-1.5 text-sm font-semibold transition",
                  city === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <ul className="max-h-64 overflow-y-auto p-2">
          {(data?.zones ?? [])
            .filter((z) => z.city === city)
            .map((z) => (
              <li key={z.id}>
                <button
                  type="button"
                  onClick={() => {
                    setZoneId(z.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted",
                    z.id === zoneId && "bg-primary-soft font-semibold text-primary",
                  )}
                >
                  {z.area}
                </button>
              </li>
            ))}
          {data && data.zones.filter((z) => z.city === city).length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">No delivery areas configured in {city} yet.</li>
          )}
        </ul>
        {firstWindow && (
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Delivery windows start from tomorrow, {firstWindow.label}. Pick your exact slot at checkout.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
