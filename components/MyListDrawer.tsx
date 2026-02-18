"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { X, ShoppingCart, Trash2, ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getDeviceHeaders } from "@/lib/device-client";
import type { CategoryWithItems, ListWithItems, PriceRange } from "@/lib/zod";
import { DoneShoppingDialog } from "@/components/DoneShoppingDialog";
import { FoundEverythingDialog } from "@/components/FoundEverythingDialog";
import { SignupGateDialog } from "@/components/SignupGateDialog";
import { Toast } from "@/components/Toast";
import { ItemsNotFoundDialog } from "@/components/ItemsNotFoundDialog";
import { RecommendationsDisplay } from "@/components/RecommendationsDisplay";
import {
  computePriceRange,
  buildVariantsByItemId,
  buildStoresById,
} from "@/lib/pricing";

interface MyListDrawerProps {
  selectedIds: Set<string>;
  categories: CategoryWithItems[];
  list: ListWithItems | null;
  onRemove: (id: string, productVariantId?: string | null) => void;
  onClear: () => void;
  isToggling: string | null;
}

interface SelectedItem {
  id: string; // grocery item ID
  listItemId: string; // list item ID (unique for each list item)
  name: string;
  icon: string | null;
  productType: string | null;
  storeName: string | null;
  productVariantId: string | null;
  price: number | null;
}

function MyListDrawerComponent({
  selectedIds,
  categories,
  list,
  onRemove,
  onClear,
  isToggling,
}: MyListDrawerProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [doneShoppingDialogOpen, setDoneShoppingDialogOpen] = useState(false);
  const [foundEverythingDialogOpen, setFoundEverythingDialogOpen] = useState(false);
  const [signupGateDialogOpen, setSignupGateDialogOpen] = useState(false);
  const [itemsNotFoundDialogOpen, setItemsNotFoundDialogOpen] = useState(false);
  const [recommendationsDialogOpen, setRecommendationsDialogOpen] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<{
    recommendations: Array<{ storeId: string; storeName: string; items: Array<{ id: string; name: string; icon: string | null }> }>;
    notFound: Array<{ id: string; name: string; icon: string | null }>;
  } | null>(null);
  
  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Price range state
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [showPriceRange, setShowPriceRange] = useState(true); // Default to true while loading
  const prevIdsRef = useRef<string>("");

  // Fetch app settings (showPriceRange flag)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/public");
        const json = await res.json();
        if (json.success && json.data) {
          setShowPriceRange(json.data.showPriceRange);
        }
        // If fetch fails, keep default (true) to avoid flicker
      } catch (err) {
        console.error("[MyListDrawer] Failed to fetch settings:", err);
        // Keep default (true) on error
      }
    };

    fetchSettings();
  }, []);

  // Check for desktop breakpoint
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Prevent body scroll when drawer is expanded on mobile
  useEffect(() => {
    if (isDesktop) return; // Only on mobile
    
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, isDesktop]);

  // Extract product type from variant name (e.g., "Gala Apples" -> "Gala")
  const extractProductType = (name: string): string => {
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

  // Get selected items with details - iterate through list items directly
  // This ensures we get the correct variant-specific items
  const selectedItems: SelectedItem[] = [];
  if (list) {
    list.items.forEach((listItem) => {
      // Find the grocery item details from categories
      const groceryItem = categories
        .flatMap((cat) => cat.items)
        .find((item) => item.id === listItem.groceryItemId);
      
      if (groceryItem) {
        const productVariant = listItem.productVariant;
        const productType = productVariant?.name 
          ? extractProductType(productVariant.name) 
          : null;
        const storeName = productVariant?.store?.name || null;
        const productVariantId = listItem.productVariantId || null;
        const price = productVariant?.price ?? null;

        selectedItems.push({
          id: groceryItem.id,
          listItemId: listItem.id,
          name: groceryItem.name,
          icon: groceryItem.icon,
          productType,
          storeName,
          productVariantId,
          price,
        });
      }
    });
  }

  const itemCount = selectedItems.length;

  // Unique groceryItemIds for batch variant fetch
  const groceryItemIds = [...new Set(selectedItems.map((i) => i.id))];

  // Fetch batch variants and compute price range when list items change
  // Only fetch if showPriceRange is enabled
  useEffect(() => {
    // If price range is disabled, clear state and skip fetch
    if (!showPriceRange) {
      setPriceRange(null);
      return;
    }

    const idsKey = groceryItemIds.sort().join(",");
    if (idsKey === prevIdsRef.current) return;
    prevIdsRef.current = idsKey;

    if (groceryItemIds.length === 0) {
      setPriceRange(null);
      return;
    }

    let cancelled = false;

    const fetchAndCompute = async () => {
      try {
        const res = await fetch(
          `/api/items/variants-batch?ids=${groceryItemIds.join(",")}`
        );
        const json = await res.json();
        if (cancelled || !json.success) return;

        const variantsByItemId = buildVariantsByItemId(json.data.items);
        const storesById = buildStoresById(json.data.stores);

        const range = computePriceRange(groceryItemIds, variantsByItemId, storesById);
        if (!cancelled) {
          setPriceRange(range);
        }
      } catch (err) {
        console.error("[MyListDrawer] variants-batch fetch error:", err);
        if (!cancelled) setPriceRange(null);
      }
    };

    fetchAndCompute();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groceryItemIds.join(","), showPriceRange]);

  // Format currency
  const fmt = useCallback(
    (n: number) =>
      new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
      }).format(n),
    []
  );

  const handleToggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleDoneShoppingClick = useCallback(() => {
    if (itemCount === 0) return;
    setDoneShoppingDialogOpen(true);
  }, [itemCount]);

  const handleDoneShoppingYes = useCallback(() => {
    setDoneShoppingDialogOpen(false);
    setFoundEverythingDialogOpen(true);
  }, []);

  const handleDoneShoppingNo = useCallback(() => {
    // Restore old flow: show ItemsNotFoundDialog to select missing items
    // Then show recommendations for other stores
    setDoneShoppingDialogOpen(false);
    setItemsNotFoundDialogOpen(true);
  }, []);

  const handleClear = useCallback(async () => {
    setFoundEverythingDialogOpen(false);
    
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify({
          outcome: "FOUND_ALL",
          action: "CLEAR",
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        onClear(); // Refresh the list
        setToastMessage("List cleared");
        setToastOpen(true);
      } else {
        console.error("Failed to clear list:", data.error);
      }
    } catch (error) {
      console.error("Error clearing list:", error);
    }
  }, [onClear]);

  const handleSaveAndClear = useCallback(async () => {
    setFoundEverythingDialogOpen(false);
    
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify({
          outcome: "FOUND_ALL",
          action: "SAVE_AND_CLEAR",
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.data.requiresAuth) {
          // Guest trying to save - show signup gate
          setSignupGateDialogOpen(true);
        } else {
          // Logged-in user - save succeeded
          onClear(); // Refresh the list
          setToastMessage("Saved ✅ Fresh list ready");
          setToastOpen(true);
        }
      } else {
        console.error("Failed to save and clear:", data.error);
      }
    } catch (error) {
      console.error("Error saving and clearing:", error);
    }
  }, [onClear]);

  const handleJustClear = useCallback(async () => {
    setSignupGateDialogOpen(false);
    await handleClear();
  }, [handleClear]);

  const handleGetRecommendations = useCallback(async (selectedItemIds: string[]) => {
    if (selectedItemIds.length === 0) return;

    setLoadingRecommendations(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify({ itemIds: selectedItemIds }),
      });

      const data = await response.json();

      if (data.success) {
        setRecommendations(data.data);
        setItemsNotFoundDialogOpen(false);
        setRecommendationsDialogOpen(true);
      } else {
        console.error("Failed to get recommendations:", data.error);
        // Still show dialog with empty recommendations
        setRecommendations({ recommendations: [], notFound: [] });
        setItemsNotFoundDialogOpen(false);
        setRecommendationsDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      // Still show dialog with empty recommendations
      setRecommendations({ recommendations: [], notFound: [] });
      setItemsNotFoundDialogOpen(false);
      setRecommendationsDialogOpen(true);
    } finally {
      setLoadingRecommendations(false);
    }
  }, []);

  // Prepare items list for ItemsNotFoundDialog
  const itemsForDialog: Array<{ id: string; name: string; icon: string | null }> = selectedItems.map(
    (item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
    })
  );

  // Desktop sidebar
  if (isDesktop) {
    return (
      <>
        <aside
          className={cn(
            "fixed top-0 right-0 h-full w-80",
            "bg-card border-l border-border",
            "flex flex-col",
            "shadow-xl"
          )}
        >
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          {/* First row: Checked Out and My List */}
          <div className="flex items-center justify-between">
            {itemCount > 0 && (
              <button
                onClick={handleDoneShoppingClick}
                className={cn(
                  "flex items-center gap-2",
                  "hover:opacity-80 transition-opacity",
                  "focus-ring"
                )}
                title="Done Shopping"
              >
                <CheckCircle2 className="w-5 h-5 text-primary-500" />
                <span className="font-semibold text-lg">Checked Out</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-500" />
              <h2 className="font-semibold text-lg">My List</h2>
              {itemCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-500 text-white rounded-full">
                  {itemCount}
                </span>
              )}
            </div>
          </div>
          {/* Second row: Clear button */}
          {itemCount > 0 && (
            <div>
              <button
                onClick={onClear}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg",
                  "text-sm font-medium text-red-600 dark:text-red-400",
                  "hover:bg-red-50 dark:hover:bg-red-950/50",
                  "focus-ring transition-colors-fast"
                )}
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Estimated Price Range */}
        {itemCount > 0 && showPriceRange && priceRange && (
          <div className="px-4 py-2 border-b border-border bg-muted/30 space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Estimated: {fmt(priceRange.minTotal)} – {fmt(priceRange.maxTotal)}
            </p>
            {priceRange.coverageMode === "store_total" ? (
              <p className="text-xs text-muted-foreground">
                Cheapest: {priceRange.minStoreName}
                {priceRange.maxStoreName && priceRange.maxStoreName !== priceRange.minStoreName
                  ? ` • Highest: ${priceRange.maxStoreName}`
                  : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Mixed-store estimate (no single retailer has every item)
            </p>
            )}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-center">Your list is empty</p>
              <p className="text-sm text-center mt-1">Tap items to add them</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedItems.map((item) => (
                <li
                  key={item.listItemId}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl",
                    "bg-muted/50 hover:bg-muted",
                    "transition-colors duration-150"
                  )}
                >
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {item.icon || "🛒"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    {(item.productType || item.storeName) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.productType && (
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                            {item.productType}
                          </span>
                        )}
                        {item.storeName && (
                          <span className="text-xs text-muted-foreground">
                            {item.storeName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    disabled={isToggling === item.id}
                    className={cn(
                      "p-2 rounded-lg",
                      "hover:bg-red-100 dark:hover:bg-red-900/30",
                      "text-muted-foreground hover:text-red-600",
                      "focus-ring transition-colors-fast",
                      isToggling === item.id && "opacity-50 cursor-wait"
                    )}
                    aria-label={`Remove ${item.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Dialogs - shared between desktop and mobile */}
      <DoneShoppingDialog
        isOpen={doneShoppingDialogOpen}
        onClose={() => setDoneShoppingDialogOpen(false)}
        onYes={handleDoneShoppingYes}
        onNo={handleDoneShoppingNo}
      />

      <FoundEverythingDialog
        isOpen={foundEverythingDialogOpen}
        onClose={() => setFoundEverythingDialogOpen(false)}
        onClear={handleClear}
        onSaveAndClear={handleSaveAndClear}
      />

      <SignupGateDialog
        isOpen={signupGateDialogOpen}
        onClose={() => setSignupGateDialogOpen(false)}
        onJustClear={handleJustClear}
      />

      <Toast
        message={toastMessage}
        isOpen={toastOpen}
        onClose={() => setToastOpen(false)}
      />

      <ItemsNotFoundDialog
        isOpen={itemsNotFoundDialogOpen}
        onClose={() => setItemsNotFoundDialogOpen(false)}
        items={itemsForDialog}
        onGetRecommendations={handleGetRecommendations}
        isLoading={loadingRecommendations}
      />

      {recommendations && (
        <RecommendationsDisplay
          isOpen={recommendationsDialogOpen}
          onClose={() => {
            setRecommendationsDialogOpen(false);
            setRecommendations(null);
            // List is kept as-is (no clearing) - this matches the old behavior
            // TODO: Eventually add location-based recommendations here
          }}
          recommendations={recommendations.recommendations}
          notFound={recommendations.notFound}
        />
      )}
    </>
    );
  }

  // Mobile bottom sheet
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 animate-fade-in lg:hidden"
          onClick={handleToggleOpen}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-card rounded-t-3xl shadow-2xl",
          "transition-all duration-300 ease-out",
          "safe-bottom lg:hidden",
          "flex flex-col",
          "overflow-hidden"
        )}
        style={{ 
          maxHeight: isOpen ? "85vh" : "4.5rem",
          minHeight: "4.5rem"
        }}
      >
        {/* Handle bar */}
        <div
          onClick={handleToggleOpen}
          className={cn(
            "w-full flex flex-col items-center pt-3 pb-2",
            "focus-ring rounded-t-3xl",
            "shrink-0 cursor-pointer"
          )}
          style={{ minHeight: "4.5rem" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggleOpen();
            }
          }}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse list" : "Expand list"}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
          <div className="flex items-center justify-between gap-2 px-4 w-full">
            <div className="flex items-center gap-2">
              {itemCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDoneShoppingClick();
                  }}
                  className={cn(
                    "flex items-center gap-2",
                    "hover:opacity-80 transition-opacity",
                    "focus-ring"
                  )}
                  title="Done Shopping"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                  <span className="font-semibold text-base">Checked Out</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-500" />
              <span className="font-semibold text-base">My List</span>
              {itemCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-500 text-white rounded-full">
                  {itemCount}
                </span>
              )}
              {isOpen ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            isOpen ? "max-h-[70vh]" : "max-h-0"
          )}
        >
          {/* Clear button */}
          {itemCount > 0 && (
            <div className="px-4 pb-2">
              <button
                onClick={onClear}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg",
                  "text-sm font-medium text-red-600 dark:text-red-400",
                  "hover:bg-red-50 dark:hover:bg-red-950/50",
                  "focus-ring transition-colors-fast"
                )}
              >
                <Trash2 className="w-4 h-4" />
                Clear bought items
              </button>
            </div>
          )}

          {/* Estimated Price Range */}
          {itemCount > 0 && showPriceRange && priceRange && (
            <div className="px-4 pb-2 bg-muted/30 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                Estimated: {fmt(priceRange.minTotal)} – {fmt(priceRange.maxTotal)}
              </p>
              {priceRange.coverageMode === "store_total" ? (
                <p className="text-xs text-muted-foreground">
                  Cheapest: {priceRange.minStoreName}
                  {priceRange.maxStoreName && priceRange.maxStoreName !== priceRange.minStoreName
                    ? ` • Highest: ${priceRange.maxStoreName}`
                    : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Mixed-store estimate (no single retailer has every item)
              </p>
              )}
            </div>
          )}

          {/* Items list */}
          <div className="overflow-y-auto px-4 pb-6" style={{ maxHeight: "60vh" }}>
            {itemCount === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <p>Your list is empty</p>
                <p className="text-sm mt-1">Tap items to add them</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedItems.map((item) => (
                  <li
                    key={item.listItemId}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl",
                      "bg-muted/50 active:bg-muted",
                      "transition-colors duration-150"
                    )}
                  >
                    <span className="text-2xl" role="img" aria-hidden="true">
                      {item.icon || "🛒"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      {(item.productType || item.storeName) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.productType && (
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                              {item.productType}
                            </span>
                          )}
                          {item.storeName && (
                            <span className="text-xs text-muted-foreground">
                              {item.storeName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemove(item.id, item.productVariantId)}
                      disabled={isToggling === item.id}
                      className={cn(
                        "p-2 rounded-lg",
                        "active:bg-red-100 dark:active:bg-red-900/30",
                        "text-muted-foreground active:text-red-600",
                        "focus-ring transition-colors-fast",
                        isToggling === item.id && "opacity-50 cursor-wait"
                      )}
                      aria-label={`Remove ${item.name}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Done Shopping Dialog (Modal 1) */}
      <DoneShoppingDialog
        isOpen={doneShoppingDialogOpen}
        onClose={() => setDoneShoppingDialogOpen(false)}
        onYes={handleDoneShoppingYes}
        onNo={handleDoneShoppingNo}
      />

      {/* Found Everything Dialog (Modal 2) */}
      <FoundEverythingDialog
        isOpen={foundEverythingDialogOpen}
        onClose={() => setFoundEverythingDialogOpen(false)}
        onClear={handleClear}
        onSaveAndClear={handleSaveAndClear}
      />

      {/* Signup Gate Dialog (Modal 3) */}
      <SignupGateDialog
        isOpen={signupGateDialogOpen}
        onClose={() => setSignupGateDialogOpen(false)}
        onJustClear={handleJustClear}
      />

      {/* Toast */}
      <Toast
        message={toastMessage}
        isOpen={toastOpen}
        onClose={() => setToastOpen(false)}
      />

      {/* Items Not Found Dialog - user selects missing items, then gets store recommendations */}
      <ItemsNotFoundDialog
        isOpen={itemsNotFoundDialogOpen}
        onClose={() => setItemsNotFoundDialogOpen(false)}
        items={itemsForDialog}
        onGetRecommendations={handleGetRecommendations}
        isLoading={loadingRecommendations}
      />

      {/* Recommendations Display */}
      {recommendations && (
        <RecommendationsDisplay
          isOpen={recommendationsDialogOpen}
          onClose={() => {
            setRecommendationsDialogOpen(false);
            setRecommendations(null);
            // List is kept as-is (no clearing) - this matches the old behavior
            // TODO: Eventually add location-based recommendations here
          }}
          recommendations={recommendations.recommendations}
          notFound={recommendations.notFound}
        />
      )}
    </>
  );
}

export const MyListDrawer = memo(MyListDrawerComponent);
