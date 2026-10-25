import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "sabtk-area-v1";

type AreaState = { zoneId: string | null; setZoneId: (id: string | null) => void };
const AreaContext = createContext<AreaState | null>(null);

export function AreaProvider({ children }: { children: ReactNode }) {
  const [zoneId, setZone] = useState<string | null>(null);
  useEffect(() => {
    setZone(localStorage.getItem(KEY));
  }, []);
  const setZoneId = (id: string | null) => {
    setZone(id);
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  };
  return <AreaContext.Provider value={{ zoneId, setZoneId }}>{children}</AreaContext.Provider>;
}

export function useArea() {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error("useArea must be used inside AreaProvider");
  return ctx;
}
