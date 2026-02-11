"use client";

import { memo, useCallback, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SearchInputComponent({
  value,
  onChange,
  placeholder = "Search groceries...",
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <Search
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2",
          "w-5 h-5 text-muted-foreground",
          "pointer-events-none"
        )}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-10 py-3",
          "bg-muted rounded-xl",
          "text-foreground placeholder:text-muted-foreground",
          "border-2 border-transparent",
          "focus:border-primary-500 focus:bg-card",
          "focus-ring transition-colors-fast",
          "text-base" // Prevents zoom on iOS
        )}
        aria-label="Search groceries"
      />
      {value && (
        <button
          onClick={handleClear}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2",
            "p-1.5 rounded-lg",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted-foreground/10",
            "focus-ring transition-colors-fast"
          )}
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export const SearchInput = memo(SearchInputComponent);
