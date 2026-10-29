import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "sabtk-theme";

type Theme = "dark" | "light";

function savedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // private mode — theme just won't persist
  }
}

export function ThemeToggle() {
  // Render a stable placeholder until hydration so server and client match.
  // On mount, read the saved preference and apply it — this component is the
  // single source of truth for the theme class after hydration.
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    const saved = savedTheme();
    applyTheme(saved);
    setTheme(saved);
  }, []);

  const isDark = theme !== "light";

  return (
    <button
      type="button"
      onClick={() => {
        const next: Theme = isDark ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
      }}
      className="grid size-10 place-items-center rounded-full text-foreground transition hover:bg-muted"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme == null ? (
        <span className="size-5" aria-hidden />
      ) : isDark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </button>
  );
}
