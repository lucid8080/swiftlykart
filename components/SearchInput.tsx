"use client";

import { memo, useCallback, useRef, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeCuisine,
  cuisineLabel,
  CUISINE_REGISTRY,
} from "@/lib/cuisineRegistry";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedCuisine?: string | null;
  onCuisineChange?: (cuisine: string | null) => void;
}

function SearchInputComponent({
  value,
  onChange,
  placeholder: externalPlaceholder,
  selectedCuisine = null,
  onCuisineChange,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("");
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef({
    cuisineIndex: 0,
    charIndex: 0,
    isTyping: true,
    waitTimeout: null as NodeJS.Timeout | null,
  });

  // Sample cuisines for animation
  const sampleCuisines = useMemo(() => {
    return CUISINE_REGISTRY.slice(0, 8).map((c) => c.label.toLowerCase());
  }, []);

  // Typing animation effect
  useEffect(() => {
    if (externalPlaceholder || selectedCuisine || value) {
      // Don't animate if there's an external placeholder, selected cuisine, or user is typing
      setAnimatedPlaceholder("");
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      if (stateRef.current.waitTimeout) {
        clearTimeout(stateRef.current.waitTimeout);
        stateRef.current.waitTimeout = null;
      }
      return;
    }

    const state = stateRef.current;

    const animate = () => {
      const currentCuisine = sampleCuisines[state.cuisineIndex];
      const fullText = `Type "${currentCuisine}" and press Enter to filter`;

      if (state.isTyping) {
        // Typing out
        if (state.charIndex <= fullText.length) {
          setAnimatedPlaceholder(fullText.slice(0, state.charIndex) + "|");
          state.charIndex++;
        } else {
          // Finished typing, wait then start deleting
          if (!state.waitTimeout) {
            state.waitTimeout = setTimeout(() => {
              state.isTyping = false;
              state.charIndex = fullText.length;
              state.waitTimeout = null;
            }, 2000); // Wait 2 seconds before deleting
          }
        }
      } else {
        // Deleting
        if (state.charIndex > 0) {
          setAnimatedPlaceholder(fullText.slice(0, state.charIndex - 1) + "|");
          state.charIndex--;
        } else {
          // Finished deleting, move to next cuisine
          state.isTyping = true;
          state.cuisineIndex = (state.cuisineIndex + 1) % sampleCuisines.length;
          state.charIndex = 0;
        }
      }
    };

    // Start animation
    animationRef.current = setInterval(animate, 50); // 50ms per character

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      if (stateRef.current.waitTimeout) {
        clearTimeout(stateRef.current.waitTimeout);
        stateRef.current.waitTimeout = null;
      }
    };
  }, [externalPlaceholder, selectedCuisine, value, sampleCuisines]);

  // Dynamic placeholder based on state
  const placeholder = useMemo(() => {
    if (externalPlaceholder) return externalPlaceholder;
    if (selectedCuisine) {
      return `Search within ${cuisineLabel(selectedCuisine)} foods…`;
    }
    if (value) {
      return "Search groceries...";
    }
    // Return animated placeholder when no value and no selected cuisine
    return animatedPlaceholder || "Search items…";
  }, [externalPlaceholder, selectedCuisine, value, animatedPlaceholder]);

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  const handleChipRemove = useCallback(() => {
    if (onCuisineChange) {
      onCuisineChange(null);
      inputRef.current?.focus();
    }
  }, [onCuisineChange]);


  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Enter: convert text to cuisine chip if it matches
      if (e.key === "Enter" && value && !selectedCuisine && onCuisineChange) {
        const normalized = normalizeCuisine(value);
        if (normalized) {
          e.preventDefault();
          onCuisineChange(normalized);
          onChange("");
          return;
        }
        // If no match, don't prevent default (allow form submission if in form)
      }

      // Backspace: remove chip if input is empty
      if (e.key === "Backspace" && !value && selectedCuisine && onCuisineChange) {
        e.preventDefault();
        onCuisineChange(null);
        return;
      }
    },
    [value, selectedCuisine, onChange, onCuisineChange]
  );


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
      {/* Wrapper div styled like input, contains chip and input */}
      <div
        className={cn(
          "flex items-center gap-2",
          "w-full px-3 py-3",
          "bg-muted rounded-xl",
          "border-2 border-transparent",
          "focus-within:border-primary-500 focus-within:bg-card",
          "transition-colors-fast"
        )}
      >
        {/* Search icon - only show when no chip */}
        {!selectedCuisine && (
          <Search
            className={cn(
              "w-5 h-5 text-muted-foreground",
              "shrink-0 pointer-events-none"
            )}
            aria-hidden="true"
          />
        )}

        {/* Cuisine chip */}
        {selectedCuisine && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg",
                "text-sm font-medium",
                "bg-primary-500/10 text-primary-700 dark:text-primary-400",
                "border border-primary-500/20"
              )}
            >
              {cuisineLabel(selectedCuisine)}
            </span>
            <button
              onClick={handleChipRemove}
              className={cn(
                "p-0.5 rounded",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted-foreground/10",
                "focus-ring transition-colors-fast"
              )}
              aria-label={`Remove ${cuisineLabel(selectedCuisine)} filter`}
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Actual input */}
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex-1 min-w-0",
            "bg-transparent",
            "text-foreground placeholder:text-muted-foreground",
            "border-none outline-none",
            "focus-ring-0",
            "text-base" // Prevents zoom on iOS
          )}
          aria-label="Search groceries"
        />

        {/* Clear button for text input */}
        {value && (
          <button
            onClick={handleClear}
            className={cn(
              "p-1.5 rounded-lg shrink-0",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted-foreground/10",
              "focus-ring transition-colors-fast"
            )}
            aria-label="Clear search"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
}

export const SearchInput = memo(SearchInputComponent);
