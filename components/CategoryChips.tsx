"use client";

import { memo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  categories: Array<{ id: string; name: string }>;
  activeCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

// Category emoji mapping
const categoryEmojis: Record<string, string> = {
  produce: "🥬",
  dairy: "🥛",
  meat: "🥩",
  pantry: "🥫",
  frozen: "🧊",
  snacks: "🍿",
  drinks: "🥤",
  household: "🧹",
  bakery: "🍞",
  deli: "🧀",
  seafood: "🦐",
};

function CategoryChipsComponent({
  categories,
  activeCategory,
  onSelect,
}: CategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active chip into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const chip = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();

      if (chipRect.left < containerRect.left || chipRect.right > containerRect.right) {
        chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activeCategory]);

  const getEmoji = (name: string): string => {
    const key = name.toLowerCase();
    return categoryEmojis[key] || "📦";
  };

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-hide",
        "px-4 py-2 -mx-4",
        "snap-x snap-mandatory"
      )}
      role="tablist"
      aria-label="Filter by category"
    >
      {/* All items chip */}
      <button
        ref={activeCategory === null ? activeRef : undefined}
        onClick={() => onSelect(null)}
        role="tab"
        aria-selected={activeCategory === null}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full",
          "whitespace-nowrap font-medium text-sm",
          "border-2 transition-all duration-200",
          "snap-start shrink-0",
          "focus-ring",
          activeCategory === null
            ? "bg-primary-500 border-primary-500 text-white shadow-md"
            : "bg-card border-border text-foreground hover:border-primary-300"
        )}
      >
        <span aria-hidden="true">🛒</span>
        <span>All</span>
      </button>

      {/* Category chips */}
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <button
            key={category.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(category.id)}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full",
              "whitespace-nowrap font-medium text-sm",
              "border-2 transition-all duration-200",
              "snap-start shrink-0",
              "focus-ring",
              isActive
                ? "bg-primary-500 border-primary-500 text-white shadow-md"
                : "bg-card border-border text-foreground hover:border-primary-300"
            )}
          >
            <span aria-hidden="true">{getEmoji(category.name)}</span>
            <span>{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export const CategoryChips = memo(CategoryChipsComponent);
