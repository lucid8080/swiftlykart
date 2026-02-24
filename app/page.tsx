"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, KeyRound, AlertCircle, ScanLine } from "lucide-react";
import { Header } from "@/components/Header";
import { SearchInput } from "@/components/SearchInput";
import { CategoryChips } from "@/components/CategoryChips";
import { ItemTile } from "@/components/ItemTile";
import { MyListDrawer } from "@/components/MyListDrawer";
import { AddToHomeBanner } from "@/components/AddToHomeBanner";
import { ProductSelectionDialog } from "@/components/ProductSelectionDialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useList } from "@/hooks/useList";
import { cn } from "@/lib/utils";
import { getDeviceHeaders } from "@/lib/device-client";
import type { Store, ProductVariant } from "@/lib/zod";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pinParam = searchParams.get("pin");
  const srcBatch = searchParams.get("srcBatch");
  const srcTag = searchParams.get("srcTag");

  const {
    categories,
    selectedIds,
    selectedVariants,
    list,
    toggleItem,
    clearList,
    refreshList,
    refreshItems,
    isLoading,
    isToggling,
    error,
    hasIdentity,
  } = useList();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [resolvingPin, setResolvingPin] = useState(false);
  
  // Product selection dialog state
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    name: string;
    icon: string | null;
  } | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  
  // Barcode scanner state
  const [scannerOpen, setScannerOpen] = useState(false);

  // Handle PIN from URL (NFC tag support)
  useEffect(() => {
    if (pinParam && !resolvingPin) {
      setResolvingPin(true);
      
      fetch("/api/pin/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify({ pin: pinParam }),
      })
        .then(async (response) => {
          const data = await response.json();
          
          // Clear PIN from URL
          window.history.replaceState({}, "", "/");
          
          if (data.success) {
            // Refresh list with new PIN session
            await refreshList();
          } else {
            setPinError(data.error || "Invalid PIN");
            // Redirect to PIN page after a moment
            setTimeout(() => {
              router.push("/pin?error=" + encodeURIComponent(data.error || "Invalid PIN"));
            }, 2000);
          }
        })
        .catch(() => {
          setPinError("Failed to verify PIN");
        })
        .finally(() => {
          setResolvingPin(false);
        });
    }
  }, [pinParam, refreshList, router, resolvingPin]);

  // NFC tap attribution is now handled globally by TapAttribution in root layout

  // Filter items based on search, category, and cuisine
  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => {
        // Filter by category
        if (activeCategory && category.id !== activeCategory) {
          return null;
        }

        // Filter by search and cuisine
        const filteredItems = category.items.filter((item) => {
          // Cuisine filter: if selectedCuisine exists, item must match (or be null if no chip selected)
          if (selectedCuisine) {
            if (item.cuisine !== selectedCuisine) {
              return false;
            }
          }
          // Items without cuisine should show when no cuisine chip is selected
          // (no additional filter needed when selectedCuisine is null)

          // Text search filter
          if (searchQuery) {
            return item.name.toLowerCase().includes(searchQuery.toLowerCase());
          }

          return true;
        });

        if (filteredItems.length === 0) return null;

        return {
          ...category,
          items: filteredItems,
        };
      })
      .filter(Boolean);
  }, [categories, activeCategory, searchQuery, selectedCuisine]);

  // Total items for display
  const totalItems = filteredCategories.reduce(
    (sum, cat) => sum + (cat?.items.length || 0),
    0
  );

  // Handle tile click - open selection dialog
  const handleTileClick = async (itemId: string) => {
    const item = categories
      .flatMap((cat) => cat.items)
      .find((i) => i.id === itemId);

    if (!item) return;

    setSelectedItem({ id: item.id, name: item.name, icon: item.icon });
    setSelectionDialogOpen(true);
    setLoadingVariants(true);

    try {
      console.log("Fetching variants for item:", itemId, item.name); // Debug log
      const response = await fetch(`/api/items/${itemId}/variants`, {
        headers: getDeviceHeaders(),
      });
      const data = await response.json();

      console.log("Variants API response:", data); // Debug log

      if (data.success) {
        const storesList = data.data?.stores || [];
        const variantsList = data.data?.variants || [];
        setStores(storesList);
        setVariants(variantsList);
        console.log("Stores:", storesList.length, "Variants:", variantsList.length); // Debug log
      } else {
        console.error("API error:", data.error, "for item:", item.name, "ID:", itemId);
        // If item not found, it might be because the database was reseeded
        // Try refreshing the items list
        if (data.code === "NOT_FOUND") {
          console.warn("Item not found - database may have been reseeded. Refreshing items list...");
          // Refresh the items list to get new IDs
          refreshItems();
        }
        setStores([]);
        setVariants([]);
      }
    } catch (error) {
      console.error("Failed to load variants:", error);
      // If variants fail to load, continue with empty arrays
      setStores([]);
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Handle generic selection
  const handleSelectGeneric = async () => {
    if (!selectedItem) return;
    await toggleItem(selectedItem.id, null);
  };

  // Handle variant selection
  const handleSelectVariant = async (variantId: string) => {
    if (!selectedItem) return;
    await toggleItem(selectedItem.id, variantId);
  };

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

  // Get product image URL for a selected item
  const getProductImageUrl = (itemId: string): string | null => {
    const variantId = selectedVariants.get(itemId);
    if (!variantId || !list) return null;

    const listItem = list.items.find(
      (item) => item.groceryItemId === itemId && item.productVariantId === variantId
    );

    return listItem?.productVariant?.imageUrl || null;
  };

  // Get product type for a selected item
  const getProductType = (itemId: string): string | null => {
    const variantId = selectedVariants.get(itemId);
    if (!variantId || !list) return null;

    const listItem = list.items.find(
      (item) => item.groceryItemId === itemId && item.productVariantId === variantId
    );

    if (!listItem?.productVariant?.name) return null;
    return extractProductType(listItem.productVariant.name);
  };

  // Get store name for a selected item
  const getStoreName = (itemId: string): string | null => {
    const variantId = selectedVariants.get(itemId);
    if (!variantId || !list) return null;

    const listItem = list.items.find(
      (item) => item.groceryItemId === itemId && item.productVariantId === variantId
    );

    return listItem?.productVariant?.store?.name || null;
  };

  // Loading state
  if (isLoading || resolvingPin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-muted-foreground">
          {resolvingPin ? "Verifying PIN..." : "Loading groceries..."}
        </p>
      </div>
    );
  }

  // PIN error from URL
  if (pinError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-semibold text-foreground">PIN Error</h1>
        <p className="text-muted-foreground text-center">{pinError}</p>
        <p className="text-sm text-muted-foreground">Redirecting to PIN entry...</p>
      </div>
    );
  }

  // No identity - prompt for PIN
  if (!hasIdentity) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary-500" />
          </div>
          <div className="text-center max-w-sm">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Access Your List
            </h1>
            <p className="text-muted-foreground">
              Enter your PIN to access your grocery list, or sign in to your account.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push("/pin")}
              className={cn(
                "px-6 py-3 rounded-xl font-medium",
                "bg-primary-500 text-white",
                "hover:bg-primary-600 active:scale-95",
                "focus-ring transition-colors-fast"
              )}
            >
              Enter PIN
            </button>
            <button
              onClick={() => router.push("/login")}
              className={cn(
                "px-6 py-3 rounded-xl font-medium",
                "bg-muted text-foreground",
                "hover:bg-muted/80 active:scale-95",
                "focus-ring transition-colors-fast"
              )}
            >
              Sign In
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:pr-80 overflow-x-hidden">
      <Header onScanClick={() => setScannerOpen(true)} />

      <main className="flex-1 flex flex-col pb-24 lg:pb-4">
        {/* Search and filters */}
        <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 lg:flex-none" style={{ overflow: 'visible' }}>
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  selectedCuisine={selectedCuisine}
                  onCuisineChange={setSelectedCuisine}
                />
              </div>
              <button
                onClick={() => setScannerOpen(true)}
                className={cn(
                  "lg:hidden", // Show on mobile, hide on desktop
                  "w-10 h-10 shrink-0 rounded-xl bg-primary-500 text-white flex items-center justify-center",
                  "hover:bg-primary-600 active:scale-95",
                  "focus-ring transition-colors-fast"
                )}
                aria-label="Scan barcode"
              >
                <ScanLine className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto overflow-x-hidden">
            <CategoryChips
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Items grid */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <span className="text-5xl mb-4">🔍</span>
              <p className="text-center">No items found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-primary-500 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredCategories.map((category) => {
                if (!category) return null;
                return (
                  <section key={category.id}>
                    <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span>{category.name}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        ({category.items.length})
                      </span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {category.items.map((item) => (
                        <ItemTile
                          key={item.id}
                          id={item.id}
                          name={item.name}
                          icon={item.icon}
                          isSelected={selectedIds.has(item.id)}
                          isToggling={isToggling === item.id}
                          productImageUrl={getProductImageUrl(item.id)}
                          productType={getProductType(item.id)}
                          storeName={getStoreName(item.id)}
                          onToggle={(id) => toggleItem(id, null)} // Quick toggle for generic item
                          onLongPress={handleTileClick} // Long press opens selection dialog
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* My List drawer */}
      <MyListDrawer
        selectedIds={selectedIds}
        categories={categories}
        list={list}
        onRemove={toggleItem}
        onClear={clearList}
        isToggling={isToggling}
      />

      {/* PWA install banner */}
      <AddToHomeBanner />

      {/* Product Selection Dialog */}
      {selectedItem && (
        <ProductSelectionDialog
          isOpen={selectionDialogOpen}
          itemId={selectedItem.id}
          itemName={selectedItem.name}
          itemIcon={selectedItem.icon}
          stores={stores}
          variants={variants}
          isLoading={loadingVariants}
          onClose={() => {
            setSelectionDialogOpen(false);
            setSelectedItem(null);
            setStores([]);
            setVariants([]);
          }}
          onSelectGeneric={handleSelectGeneric}
          onSelectVariant={handleSelectVariant}
        />
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(productName) => {
          // Refresh list in background (non-blocking)
          // The API optimization will make this much faster now
          refreshList().catch(() => {
            // Silently fail - user already sees success message
          });
        }}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
