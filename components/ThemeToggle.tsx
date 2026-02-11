"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={cn(
          "w-10 h-10 rounded-xl bg-muted flex items-center justify-center",
          "focus-ring transition-colors-fast"
        )}
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5 bg-muted-foreground/30 rounded animate-pulse" />
      </button>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "w-10 h-10 rounded-xl bg-muted flex items-center justify-center",
        "hover:bg-muted/80 active:scale-95",
        "focus-ring transition-colors-fast"
      )}
      aria-label={`Current theme: ${theme}. Click to change.`}
    >
      {theme === "light" && <Sun className="w-5 h-5 text-primary-500" />}
      {theme === "dark" && <Moon className="w-5 h-5 text-primary-400" />}
      {theme === "system" && <Monitor className="w-5 h-5 text-muted-foreground" />}
    </button>
  );
}
