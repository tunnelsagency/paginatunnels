"use client";

import { useEffect, useState } from "react";
import { MoonStar, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("tunnel-theme");
    const initial = stored === "light" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", initial === "dark");
    document.documentElement.classList.toggle("light", initial === "light");
    setTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem("tunnel-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 border border-white/10 bg-white/5"
        aria-label="Toggle theme"
        disabled
      >
        <MoonStar className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 border border-white/10 bg-white/5"
      aria-label="Cambiar tema"
      onClick={() => setTheme((mode) => (mode === "dark" ? "light" : "dark"))}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-300" />
      ) : (
        <MoonStar className="h-4 w-4 text-indigo-400" />
      )}
    </Button>
  );
}
