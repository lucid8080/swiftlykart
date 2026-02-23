"use client";

import { memo, useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemTileProps {
  id: string;
  name: string;
  icon: string | null;
  isSelected: boolean;
  isToggling: boolean;
  productImageUrl?: string | null; // Product image when variant is selected
  productType?: string | null; // Product type when variant is selected
  storeName?: string | null; // Store name when variant is selected
  onToggle: (id: string) => void;
  onLongPress?: (id: string) => void; // Long press handler for selection dialog
}

function ItemTileComponent({
  id,
  name,
  icon,
  isSelected,
  isToggling,
  productImageUrl,
  productType,
  storeName,
  onToggle,
  onLongPress,
}: ItemTileProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const hasLongPressed = useRef(false);

  const handleClick = () => {
    // Don't toggle if we just long-pressed
    if (hasLongPressed.current) {
      hasLongPressed.current = false;
      return;
    }
    
    if (!isToggling) {
      onToggle(id);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onLongPress) return;
    
    hasLongPressed.current = false;
    setIsLongPressing(true);
    
    longPressTimer.current = setTimeout(() => {
      hasLongPressed.current = true;
      setIsLongPressing(false);
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      console.log("Long press detected for:", id, name); // Debug log
      onLongPress(id);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
    hasLongPressed.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onLongPress) return;
    
    hasLongPressed.current = false;
    setIsLongPressing(true);
    
    longPressTimer.current = setTimeout(() => {
      hasLongPressed.current = true;
      setIsLongPressing(false);
      console.log("Long press detected (mouse) for:", id, name); // Debug log
      onLongPress(id);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
    hasLongPressed.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      disabled={isToggling}
      aria-pressed={isSelected}
      aria-label={`${name}${isSelected ? " (selected)" : ""}. ${onLongPress ? "Long press for options" : ""}`}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "w-full aspect-square p-3 rounded-2xl",
        "border-2 transition-all duration-200 ease-out",
        "focus-ring",
        // Default state
        !isSelected && [
          "bg-card border-border",
          "hover:border-primary-200 hover:bg-primary-50/50",
          "dark:hover:border-primary-700 dark:hover:bg-primary-950/30",
        ],
        // Selected state
        isSelected && [
          "bg-selected border-selected",
          "shadow-md shadow-primary-500/10",
        ],
        // Toggling state
        isToggling && "opacity-60 cursor-wait",
        // Long pressing state
        isLongPressing && "scale-95 opacity-80",
        // Active press effect (only if not long pressing)
        !isLongPressing && "active:scale-95"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-2 right-2 w-6 h-6 rounded-full",
          "flex items-center justify-center",
          "transition-all duration-200",
          isSelected
            ? "bg-primary-500 scale-100"
            : "bg-muted scale-0"
        )}
      >
        <Check
          className={cn(
            "w-4 h-4 text-white",
            "transition-transform duration-200",
            isSelected ? "scale-100" : "scale-0"
          )}
          strokeWidth={3}
        />
      </div>

      {/* Icon or Product Image */}
      {productImageUrl && isSelected ? (
        <Image
          src={productImageUrl}
          alt={name}
          width={80}
          height={80}
          className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 mb-2 rounded-xl object-cover",
            "transition-transform duration-200",
            isSelected && "scale-110"
          )}
          unoptimized
        />
      ) : (
        <span
          className={cn(
            "text-3xl sm:text-4xl mb-2",
            "transition-transform duration-200",
            isSelected && "scale-110"
          )}
          role="img"
          aria-hidden="true"
        >
          {icon || "🛒"}
        </span>
      )}

      {/* Name */}
      <span
        className={cn(
          "text-sm font-medium text-center leading-tight",
          "line-clamp-2",
          isSelected ? "text-primary-700 dark:text-primary-300" : "text-foreground"
        )}
      >
        {name}
      </span>

      {/* Product Type and Store Name - shown when variant is selected */}
      {isSelected && (productType || storeName) && (
        <div className="mt-1 flex flex-col items-center gap-0.5">
          {productType && (
            <span
              className={cn(
                "text-xs font-medium text-center",
                "text-primary-600 dark:text-primary-400"
              )}
            >
              {productType}
            </span>
          )}
          {storeName && (
            <span
              className={cn(
                "text-xs text-center",
                "text-muted-foreground"
              )}
            >
              {storeName}
            </span>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {isToggling && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-2xl">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}

export const ItemTile = memo(ItemTileComponent);
