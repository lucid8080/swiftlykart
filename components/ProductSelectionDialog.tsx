"use client";

import { memo, useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductVariant, Store as StoreType } from "@/lib/zod";

interface ProductSelectionDialogProps {
  isOpen: boolean;
  itemId: string;
  itemName: string;
  itemIcon: string | null;
  stores: StoreType[];
  variants: ProductVariant[];
  isLoading?: boolean;
  onClose: () => void;
  onSelectGeneric: () => void;
  onSelectVariant: (variantId: string) => void;
}

type ViewMode = "store" | "brand" | "type";

function ProductSelectionDialogComponent({
  isOpen,
  itemId: _itemId,
  itemName,
  itemIcon,
  stores: _stores,
  variants,
  isLoading = false,
  onClose,
  onSelectGeneric,
  onSelectVariant,
}: ProductSelectionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("store");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  // Swipe gesture state
  const swipeStateRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    isSwiping: boolean;
    targetId: string | null;
  }>({
    startX: 0,
    startY: 0,
    currentX: 0,
    isSwiping: false,
    targetId: null,
  });

  // Extract apple type from variant name (e.g., "Gala Apples" -> "Gala")
  const extractAppleType = (name: string): string => {
    // Common apple types
    const types = [
      "Gala", "Fuji", "Honeycrisp", "Red Delicious", "Granny Smith",
      "Pink Lady", "Golden Delicious", "McIntosh", "Braeburn", "Jazz",
      "Crispin", "Empire", "Cortland", "Rome", "Idared"
    ];
    
    for (const type of types) {
      if (name.toLowerCase().includes(type.toLowerCase())) {
        return type;
      }
    }
    
    // Fallback: try to extract first word before "Apple" or "Apples"
    const match = name.match(/(\w+)\s*(?:Apple|Apples)/i);
    if (match) {
      return match[1];
    }
    
    return name; // Return full name if no type found
  };

  // Extract brand from variant name
  // For now, we detect "Organic" as a brand indicator, otherwise use store name
  // In the future, this could be extracted from variant data or a separate brand field
  const extractBrand = (variant: ProductVariant): string => {
    const name = variant.name.toLowerCase();
    
    // Check for organic
    if (name.includes("organic")) {
      return "Organic";
    }
    
    // Could add more brand detection here in the future
    // For now, use store name as brand
    return variant.store?.name || "Unknown";
  };

  // Group variants by view mode
  const groupedOptions = useMemo(() => {
    if (!variants || variants.length === 0) return [];

    if (viewMode === "store") {
      // Group by store
      const storeMap = new Map<string, ProductVariant[]>();
      variants.forEach((variant) => {
        const storeName = variant.store?.name || "Unknown Store";
        if (!storeMap.has(storeName)) {
          storeMap.set(storeName, []);
        }
        storeMap.get(storeName)!.push(variant);
      });

      return Array.from(storeMap.entries()).map(([storeName, storeVariants]) => ({
        groupName: storeName,
        variants: storeVariants,
      }));
    } else if (viewMode === "brand") {
      // Group by brand (using store as brand for now)
      const brandMap = new Map<string, ProductVariant[]>();
      variants.forEach((variant) => {
        const brand = extractBrand(variant);
        if (!brandMap.has(brand)) {
          brandMap.set(brand, []);
        }
        brandMap.get(brand)!.push(variant);
      });

      return Array.from(brandMap.entries()).map(([brandName, brandVariants]) => ({
        groupName: brandName,
        variants: brandVariants,
      }));
    } else {
      // Group by type, then by store within each type
      const typeMap = new Map<string, Map<string, ProductVariant[]>>();
      variants.forEach((variant) => {
        const type = extractAppleType(variant.name);
        const storeName = variant.store?.name || "Unknown Store";
        
        if (!typeMap.has(type)) {
          typeMap.set(type, new Map());
        }
        const storeMap = typeMap.get(type)!;
        
        if (!storeMap.has(storeName)) {
          storeMap.set(storeName, []);
        }
        storeMap.get(storeName)!.push(variant);
      });

      // Convert to flat structure where each type has stores as sub-groups
      return Array.from(typeMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([typeName, storeMap]) => {
          // Flatten all variants for the type (for counting)
          const allTypeVariants = Array.from(storeMap.values()).flat();
          // Create store groups
          const storeGroups = Array.from(storeMap.entries()).map(([storeName, storeVariants]) => ({
            storeName,
            variants: storeVariants,
          }));
          
          return {
            groupName: typeName,
            variants: allTypeVariants,
            storeGroups: storeGroups, // Nested store groups
          };
        });
    }
  }, [variants, viewMode]);

  // Build flat list of all options (Apple-style) based on view mode
  const allOptions: Array<{
    id: string;
    name: string;
    subtitle?: string;
    imageUrl?: string | null;
    icon?: string | null;
    onClick: () => void;
    variants?: ProductVariant[];
    isGroup?: boolean;
    storeGroups?: Array<{ storeName: string; variants: ProductVariant[] }>;
  }> = useMemo(() => {
    const options: Array<{
      id: string;
      name: string;
      subtitle?: string;
      imageUrl?: string | null;
      icon?: string | null;
      onClick: () => void;
      variants?: ProductVariant[];
      isGroup?: boolean;
      storeGroups?: Array<{ storeName: string; variants: ProductVariant[] }>;
    }> = [
      {
        id: "generic",
        name: `Generic ${itemName}`,
        subtitle: "Any brand or store",
        icon: itemIcon,
        onClick: () => {
          onSelectGeneric();
          onClose();
        },
      },
    ];

    // Add only the groups (stores/brands/types) - not the variants
    groupedOptions.forEach((group) => {
      const storeGroups = 'storeGroups' in group && Array.isArray(group.storeGroups) ? group.storeGroups : undefined;
      options.push({
        id: `group-${group.groupName}`,
        name: group.groupName,
        subtitle: storeGroups 
          ? `${storeGroups.length} ${storeGroups.length === 1 ? "store" : "stores"}`
          : `${group.variants.length} ${group.variants.length === 1 ? "option" : "options"}`,
        icon: null,
        variants: group.variants,
        isGroup: true,
        storeGroups: storeGroups,
        onClick: () => {
          // When clicking a group, select the first variant in that group
          // Or we could show a sub-menu, but for now, select first variant
          if (group.variants.length > 0) {
            onSelectVariant(group.variants[0].id);
            onClose();
          }
        },
      });
    });

    return options;
  }, [groupedOptions, itemName, itemIcon, onSelectGeneric, onSelectVariant, onClose]);

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent, optionId: string) => {
    const touch = e.touches[0];
    swipeStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isSwiping: false,
      targetId: optionId,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStateRef.current.targetId) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStateRef.current.startX;
    const deltaY = touch.clientY - swipeStateRef.current.startY;
    
    // Only consider it a swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      swipeStateRef.current.isSwiping = true;
      swipeStateRef.current.currentX = touch.clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!swipeStateRef.current.targetId) return;
    
    const deltaX = swipeStateRef.current.currentX - swipeStateRef.current.startX;
    const threshold = 50; // Minimum swipe distance
    
    // If swiped left significantly, expand the group
    if (swipeStateRef.current.isSwiping && deltaX < -threshold) {
      const optionId = swipeStateRef.current.targetId;
      const option = allOptions.find((opt) => opt.id === optionId);
      
      // Only expand if it's a group with variants
      if (option?.isGroup && option.variants && option.variants.length > 0) {
        setExpandedGroupId(expandedGroupId === optionId ? null : optionId);
      }
    }
    
    // Reset swipe state
    swipeStateRef.current = {
      startX: 0,
      startY: 0,
      currentX: 0,
      isSwiping: false,
      targetId: null,
    };
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      // Reset expanded state when dialog closes
      setExpandedGroupId(null);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-selection-title"
      onClick={(e) => {
        // Close if clicking backdrop
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet - Apple Style */}
      <div
        className={cn(
          "relative w-full",
          "bg-card rounded-t-3xl shadow-2xl",
          "max-h-[90vh] flex flex-col",
          "animate-slide-up safe-bottom",
          "touch-pan-y" // Enable native scroll on mobile
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-border/50">
          <h2
            id="product-selection-title"
            className="text-lg font-semibold text-foreground text-center mb-3"
          >
            {itemName}
          </h2>
          
          {/* View Mode Toggle */}
          <div className="flex gap-2 bg-muted/30 rounded-lg p-1">
            <button
              onClick={() => setViewMode("store")}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all",
                viewMode === "store"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Store
            </button>
            <button
              onClick={() => setViewMode("type")}
              className={cn(
                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all",
                viewMode === "type"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Type
            </button>
          </div>
        </div>

        {/* Scrollable Content - Apple Action Sheet Style */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            maxHeight: "calc(90vh - 80px)",
          }}
        >
          {/* Options List */}
          <div className="py-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <p>Loading options...</p>
                </div>
              </div>
            ) : allOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <p>No product options available</p>
                <p className="text-sm mt-2">Try refreshing or check your connection</p>
              </div>
            ) : (
              allOptions.map((option, index) => {
              const isFirst = index === 0;
              const isLastVisible = index === allOptions.length - 1;
              const isGroup = option.isGroup || option.id.startsWith("group-");
              const isExpanded = expandedGroupId === option.id;
              const hasVariants = option.variants && option.variants.length > 0;
              // Show divider if not last and not expanded (expanded items will have their own divider after variants)
              const showDivider = !isLastVisible && !isExpanded;

              return (
                <div key={option.id}>
                  <button
                    onTouchStart={(e) => handleTouchStart(e, option.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => {
                      // For groups with variants, toggle expansion on click
                      if (isGroup && hasVariants) {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedGroupId(expandedGroupId === option.id ? null : option.id);
                      } else {
                        // For non-groups or groups without variants, use the original onClick
                        option.onClick();
                      }
                    }}
                    className={cn(
                      "w-full px-4 py-3.5",
                      "flex items-center gap-3",
                      "text-left",
                      "active:bg-muted/50",
                      "transition-colors duration-150",
                      "focus-ring",
                      "relative",
                      // First item rounded top
                      isFirst && !isExpanded && "rounded-t-2xl",
                      // Divider
                      showDivider && "border-b border-border/30"
                    )}
                  >
                    {/* Icon or Image */}
                    {option.imageUrl ? (
                      <Image
                        src={option.imageUrl}
                        alt={option.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                        unoptimized
                      />
                    ) : (
                      <span
                        className="text-2xl shrink-0"
                        role="img"
                        aria-hidden="true"
                      >
                        {option.icon || (isGroup ? "🏷️" : "🛒")}
                      </span>
                    )}

                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-base">
                        {option.name}
                      </p>
                      {option.subtitle && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {option.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Swipe/Click indicator for groups with variants */}
                    {isGroup && hasVariants && !isExpanded && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 border border-border/50 shrink-0">
                        <span className="text-lg font-bold text-primary animate-pulse">←</span>
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">
                          Swipe or click for options
                        </span>
                      </div>
                    )}
                    {isGroup && isExpanded && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 shrink-0">
                        <span className="text-sm font-semibold text-primary">✓</span>
                        <span className="text-xs text-primary">Expanded</span>
                      </div>
                    )}
                  </button>

                  {/* Expanded variants list */}
                  {isExpanded && hasVariants && (
                    <div className={cn(
                      "bg-muted/20",
                      isLastVisible && "rounded-b-2xl",
                      !isLastVisible && "border-b border-border/30"
                    )}>
                      {/* For type view, show stores; otherwise show variants */}
                      {option.storeGroups && viewMode === "type" ? (
                        // Show stores for type view
                        option.storeGroups.map((storeGroup, storeIndex) => {
                          const isStoreLast = storeIndex === option.storeGroups!.length - 1;
                          return (
                            <div key={storeGroup.storeName}>
                              <button
                                onClick={() => {
                                  // Select first variant from this store
                                  if (storeGroup.variants.length > 0) {
                                    onSelectVariant(storeGroup.variants[0].id);
                                    onClose();
                                  }
                                }}
                                className={cn(
                                  "w-full px-4 py-3.5 pl-12",
                                  "flex items-center gap-3",
                                  "text-left",
                                  "active:bg-muted/50",
                                  "transition-colors duration-150",
                                  "focus-ring",
                                  !isStoreLast && "border-b border-border/20"
                                )}
                              >
                                {/* Store Icon */}
                                <span
                                  className="text-2xl shrink-0"
                                  role="img"
                                  aria-hidden="true"
                                >
                                  🏪
                                </span>

                                {/* Store Content */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground text-base">
                                    {storeGroup.storeName}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {storeGroup.variants.length} {storeGroup.variants.length === 1 ? "option" : "options"}
                                  </p>
                                </div>
                              </button>
                              
                              {/* Show variants for this store */}
                              {storeGroup.variants.map((variant, variantIndex) => {
                                const isVariantLast = variantIndex === storeGroup.variants.length - 1 && isStoreLast;
                                return (
                                  <button
                                    key={variant.id}
                                    onClick={() => {
                                      onSelectVariant(variant.id);
                                      onClose();
                                    }}
                                    className={cn(
                                      "w-full px-4 py-3.5 pl-20",
                                      "flex items-center gap-3",
                                      "text-left",
                                      "active:bg-muted/50",
                                      "transition-colors duration-150",
                                      "focus-ring",
                                      !isVariantLast && "border-b border-border/20",
                                      isVariantLast && isLastVisible && "rounded-b-2xl"
                                    )}
                                  >
                                    {/* Variant Image */}
                                    {variant.imageUrl ? (
                                      <Image
                                        src={variant.imageUrl}
                                        alt={variant.name}
                                        width={40}
                                        height={40}
                                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                                        unoptimized
                                      />
                                    ) : (
                                      <span
                                        className="text-2xl shrink-0"
                                        role="img"
                                        aria-hidden="true"
                                      >
                                        {itemIcon || "🛒"}
                                      </span>
                                    )}

                                    {/* Variant Content */}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground text-base">
                                        {variant.name}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })
                      ) : (
                        // Show variants directly for store/brand view
                        option.variants!.map((variant, variantIndex) => {
                          const isVariantLast = variantIndex === option.variants!.length - 1;
                          return (
                            <button
                              key={variant.id}
                              onClick={() => {
                                onSelectVariant(variant.id);
                                onClose();
                              }}
                              className={cn(
                                "w-full px-4 py-3.5 pl-12",
                                "flex items-center gap-3",
                                "text-left",
                                "active:bg-muted/50",
                                "transition-colors duration-150",
                                "focus-ring",
                                !isVariantLast && "border-b border-border/20",
                                isVariantLast && isLastVisible && "rounded-b-2xl"
                              )}
                            >
                              {/* Variant Image */}
                              {variant.imageUrl ? (
                                <Image
                                  src={variant.imageUrl}
                                  alt={variant.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                                  unoptimized
                                />
                              ) : (
                                <span
                                  className="text-2xl shrink-0"
                                  role="img"
                                  aria-hidden="true"
                                >
                                  {itemIcon || "🛒"}
                                </span>
                              )}

                              {/* Variant Content */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground text-base">
                                  {variant.name}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
            )}
          </div>

          {/* Cancel button - Apple style */}
          <div className="pt-2 pb-4 px-4">
            <button
              onClick={onClose}
              className={cn(
                "w-full py-3.5 rounded-2xl",
                "bg-muted/50 active:bg-muted",
                "font-medium text-foreground",
                "transition-colors duration-150",
                "focus-ring"
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProductSelectionDialog = memo(ProductSelectionDialogComponent);
