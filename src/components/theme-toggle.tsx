"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Returns false during SSR and the first client render, true afterward.
// next-themes resolves the real theme on the first client render, so rendering
// a theme-dependent icon immediately would mismatch the server's HTML. This
// defers the swap past hydration without a setState-in-effect (which the lint
// rules disallow).
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const hydrated = useHydrated();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = hydrated && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      disabled={!hydrated}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Moon /> : <Sun />}
    </Button>
  );
}
