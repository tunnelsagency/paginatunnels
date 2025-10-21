"use client";

import { useEffect, useState } from "react";
import { MoonStar, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tunnels-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = readInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full border border-primary/30 bg-primary/15 text-primary shadow-sm"
        aria-label="Toggle theme"
        disabled
      >
        <MoonStar className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full border border-primary/30 bg-primary/15 text-primary shadow-sm transition-colors hover:bg-primary/20 dark:border-primary/50 dark:bg-secondary/40 dark:text-primary-foreground/90 dark:hover:bg-secondary/50"
      aria-label="Cambiar tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4 text-sky-200" /> : <MoonStar className="h-4 w-4 text-sky-700" />}
    </Button>
  );
}
