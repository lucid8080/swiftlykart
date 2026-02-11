"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  X,
  Check,
  Package,
  Grid,
  Store,
  DollarSign,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  _count?: { items: number };
}

interface StoreVariant {
  id: string;
  storeId: string;
  name: string;
  price: number | null;
  barcode: string | null;
  imageUrl: string | null;
}

interface GroceryItem {
  id: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  category: { id: string; name: string };
  estimatedPrice: number | null;
  storeVariant?: StoreVariant | null; // Present when storeId filter is active
}

interface Store {
  id: string;
  name: string;
  logo: string | null;
}

interface ProductVariant {
  id: string;
  groceryItemId: string;
  storeId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  barcode: string | null;
  store: Store;
}

// Inline variant row component
function InlineVariantRow({
  item,
  variant,
  isSaving,
  onSave,
  onClear,
}: {
  item: GroceryItem;
  variant: StoreVariant | null | undefined;
  isSaving: boolean;
  onSave: (item: GroceryItem, data: { name: string; price: string; barcode: string; imageUrl: string }) => void;
  onClear: (item: GroceryItem) => void;
}) {
  const [name, setName] = useState(variant?.name || item.name);
  const [price, setPrice] = useState(variant?.price?.toString() || "");
  const [barcode, setBarcode] = useState(variant?.barcode || "");
  const [imageUrl, setImageUrl] = useState(variant?.imageUrl || "");

  // Sync state when variant changes
  useEffect(() => {
    setName(variant?.name || item.name);
    setPrice(variant?.price?.toString() || "");
    setBarcode(variant?.barcode || "");
    setImageUrl(variant?.imageUrl || "");
  }, [variant, item.name]);

  const handleSave = () => {
    onSave(item, { name, price, barcode, imageUrl });
  };

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3 text-2xl">{item.icon || "🛒"}</td>
      <td className="px-4 py-3 font-medium">{item.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{item.category.name}</td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Variant name"
          className={cn(
            "w-full px-2 py-1.5 rounded text-sm",
            "bg-muted border border-transparent",
            "focus:border-primary-500 focus:bg-card",
            "focus-ring"
          )}
          disabled={isSaving}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          className={cn(
            "w-full px-2 py-1.5 rounded text-sm",
            "bg-muted border border-transparent",
            "focus:border-primary-500 focus:bg-card",
            "focus-ring",
            !price && "border-red-300 dark:border-red-700"
          )}
          disabled={isSaving}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Optional"
          className={cn(
            "w-full px-2 py-1.5 rounded text-sm",
            "bg-muted border border-transparent",
            "focus:border-primary-500 focus:bg-card",
            "focus-ring"
          )}
          disabled={isSaving}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={isSaving || !price || parseFloat(price) <= 0}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              "bg-primary-500 text-white",
              "hover:bg-primary-600",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus-ring"
            )}
            title={variant ? "Update variant" : "Create variant"}
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : variant ? (
              "Save"
            ) : (
              "Create"
            )}
          </button>
          {variant && (
            <button
              onClick={() => onClear(item)}
              disabled={isSaving}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                "bg-red-500 text-white",
                "hover:bg-red-600",
                "disabled:opacity-50",
                "focus-ring"
              )}
              title="Delete variant"
            >
              Clear
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminItemsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store filter state
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [savingVariants, setSavingVariants] = useState<Set<string>>(new Set());

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<GroceryItem | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  
  // Variant form state
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantStoreId, setVariantStoreId] = useState("");
  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantImageUrl, setVariantImageUrl] = useState("");
  const [variantBarcode, setVariantBarcode] = useState("");

  // Form state
  const [categoryName, setCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemIcon, setItemIcon] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Check admin access
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/");
    }
  }, [status, session, router]);

  // Fetch stores on mount
  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchStores();
    }
  }, [session]);

  // Fetch data when filters change
  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchData();
    }
  }, [session, selectedStoreId, searchQuery, selectedCategoryId]);

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/admin/stores");
      const data = await res.json();
      if (data.success) setAllStores(data.data);
    } catch {
      setError("Failed to load stores");
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedStoreId) params.set("storeId", selectedStoreId);
      if (searchQuery) params.set("q", searchQuery);
      if (selectedCategoryId) params.set("categoryId", selectedCategoryId);
      params.set("page", "1");
      params.set("pageSize", "1000"); // Large page size for now

      const [catRes, itemsRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch(`/api/admin/items?${params.toString()}`),
      ]);

      const catData = await catRes.json();
      const itemsData = await itemsRes.json();

      if (catData.success) setCategories(catData.data);
      if (itemsData.success) {
        let itemsList = itemsData.data || [];
        // Filter missing variants if toggle is on
        if (selectedStoreId && missingOnly) {
          itemsList = itemsList.filter((item: GroceryItem) => !item.storeVariant);
        }
        setItems(itemsList);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Category handlers
  const openCategoryModal = (category?: Category) => {
    setEditingCategory(category || null);
    setCategoryName(category?.name || "");
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    setFormLoading(true);

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";
      
      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCategoryModal(false);
        fetchData();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to save category");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its items?")) return;

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch {
      setError("Failed to delete category");
    }
  };

  // Item handlers
  const openItemModal = (item?: GroceryItem) => {
    setEditingItem(item || null);
    setItemName(item?.name || "");
    setItemIcon(item?.icon || "");
    setItemCategoryId(item?.category.id || categories[0]?.id || "");
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim() || !itemCategoryId) return;
    setFormLoading(true);

    try {
      const url = editingItem
        ? `/api/admin/items/${editingItem.id}`
        : "/api/admin/items";
      
      const response = await fetch(url, {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemName.trim(),
          icon: itemIcon.trim() || null,
          categoryId: itemCategoryId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowItemModal(false);
        fetchData();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to save item");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;

    try {
      const response = await fetch(`/api/admin/items/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch {
      setError("Failed to delete item");
    }
  };

  const handleToggleItemActive = async (item: GroceryItem) => {
    try {
      await fetch(`/api/admin/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      fetchData();
    } catch {
      setError("Failed to update item");
    }
  };

  // Inline variant save handler
  const handleSaveInlineVariant = async (
    item: GroceryItem,
    variantData: {
      name: string;
      price: string;
      barcode: string;
      imageUrl: string;
    }
  ) => {
    if (!selectedStoreId) return;
    
    // Validate price is required
    const priceNum = variantData.price.trim() ? parseFloat(variantData.price) : null;
    if (priceNum === null || isNaN(priceNum) || priceNum <= 0) {
      setError("Price is required and must be positive");
      return;
    }

    setSavingVariants((prev) => new Set(prev).add(item.id));
    setError(null);

    try {
      const response = await fetch("/api/admin/variants/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groceryItemId: item.id,
          storeId: selectedStoreId,
          name: variantData.name.trim() || item.name,
          price: priceNum,
          barcode: variantData.barcode.trim() || null,
          imageUrl: variantData.imageUrl.trim() || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh data
        await fetchData();
      } else {
        setError(data.error || "Failed to save variant");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save variant");
    } finally {
      setSavingVariants((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleClearVariant = async (item: GroceryItem) => {
    if (!selectedStoreId || !item.storeVariant) return;
    
    if (!confirm("Delete this variant?")) return;

    try {
      const response = await fetch(`/api/admin/variants/${item.storeVariant.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchData();
      } else {
        setError("Failed to delete variant");
      }
    } catch {
      setError("Failed to delete variant");
    }
  };

  // Variants handlers
  const openVariantsModal = async (item: GroceryItem) => {
    setSelectedItemForVariants(item);
    setShowVariantsModal(true);
    setVariantsLoading(true);
    
    try {
      const [storesRes, variantsRes] = await Promise.all([
        fetch("/api/admin/stores"),
        fetch(`/api/items/${item.id}/variants`),
      ]);
      
      const storesData = await storesRes.json();
      const variantsData = await variantsRes.json();
      
      if (storesData.success) setStores(storesData.data);
      if (variantsData.success) {
        setVariants(variantsData.data.variants || []);
      }
    } catch {
      setError("Failed to load stores and variants");
    } finally {
      setVariantsLoading(false);
    }
  };

  const openVariantForm = (variant?: ProductVariant, storeId?: string) => {
    setEditingVariant(variant || null);
    setVariantStoreId(storeId || variant?.storeId || stores[0]?.id || "");
    setVariantName(variant?.name || "");
    setVariantPrice(variant?.price?.toString() || "");
    setVariantImageUrl(variant?.imageUrl || "");
    setVariantBarcode(variant?.barcode || "");
    setShowVariantForm(true);
  };

  const handleSaveVariant = async () => {
    if (!variantName.trim() || !variantStoreId || !selectedItemForVariants) {
      setError("Please fill in all required fields");
      return;
    }
    
    setFormLoading(true);
    setError(null);
    
    try {
      // Parse price - handle empty string and NaN
      let parsedPrice: number | null = null;
      if (variantPrice.trim()) {
        const numPrice = parseFloat(variantPrice);
        if (!isNaN(numPrice) && numPrice > 0) {
          parsedPrice = numPrice;
        }
      }

      const variantData = {
        groceryItemId: selectedItemForVariants.id,
        storeId: variantStoreId,
        name: variantName.trim(),
        price: parsedPrice,
        imageUrl: variantImageUrl.trim() || null,
        barcode: variantBarcode.trim() || null,
      };
      
      console.log("Saving variant:", variantData);
      
      const url = editingVariant
        ? `/api/admin/variants/${editingVariant.id}`
        : "/api/admin/variants";
      
      const response = await fetch(url, {
        method: editingVariant ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variantData),
      });
      
      const data = await response.json();
      console.log("Save response:", data);
      
      if (data.success) {
        setShowVariantForm(false);
        setEditingVariant(null);
        // Clear form
        setVariantName("");
        setVariantPrice("");
        setVariantImageUrl("");
        setVariantBarcode("");
        
        // Refresh variants
        setVariantsLoading(true);
        try {
          const variantsRes = await fetch(`/api/items/${selectedItemForVariants.id}/variants`);
          const variantsData = await variantsRes.json();
          console.log("Refreshed variants:", variantsData);
          if (variantsData.success) {
            setVariants(variantsData.data.variants || []);
          } else {
            console.error("Failed to refresh variants:", variantsData);
          }
        } catch (refreshError) {
          console.error("Error refreshing variants:", refreshError);
        } finally {
          setVariantsLoading(false);
        }
        
        fetchData(); // Refresh items to update estimated price
      } else {
        const errorMsg = data.error || "Failed to save variant";
        console.error("Save failed:", errorMsg, data);
        setError(errorMsg);
      }
    } catch (error: any) {
      console.error("Error saving variant:", error);
      setError(error.message || "Failed to save variant");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm("Delete this product variant?")) return;
    
    try {
      const response = await fetch(`/api/admin/variants/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        // Refresh variants
        if (selectedItemForVariants) {
          const variantsRes = await fetch(`/api/items/${selectedItemForVariants.id}/variants`);
          const variantsData = await variantsRes.json();
          if (variantsData.success) {
            setVariants(variantsData.data.variants || []);
          }
        }
        fetchData(); // Refresh items to update estimated price
      }
    } catch {
      setError("Failed to delete variant");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/account"
              className={cn(
                "p-2 -ml-2 rounded-lg",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted focus-ring"
              )}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Admin: Items</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/users"
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium",
                "bg-muted text-foreground hover:bg-muted/80",
                "focus-ring transition-colors-fast"
              )}
            >
              👥 Users
            </Link>
            <Link
              href="/admin/nfc"
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium",
                "bg-primary-500 text-white hover:bg-primary-600",
                "focus-ring transition-colors-fast"
              )}
            >
              📡 NFC Analytics
            </Link>
            <Link
              href="/admin/settings"
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium",
                "bg-muted text-foreground hover:bg-muted/80",
                "focus-ring transition-colors-fast"
              )}
            >
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Categories section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold">Categories</h2>
              <span className="text-sm text-muted-foreground">
                ({categories.length})
              </span>
            </div>
            <button
              onClick={() => openCategoryModal()}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg",
                "bg-primary-500 text-white font-medium text-sm",
                "hover:bg-primary-600 focus-ring"
              )}
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  "bg-card rounded-xl p-4 border border-border",
                  "flex flex-col gap-2"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cat._count?.items || 0} items
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openCategoryModal(cat)}
                    className="p-1.5 rounded hover:bg-muted"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Items section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold">Items</h2>
              <span className="text-sm text-muted-foreground">
                ({items.length})
              </span>
            </div>
            <button
              onClick={() => openItemModal()}
              disabled={categories.length === 0}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg",
                "bg-primary-500 text-white font-medium text-sm",
                "hover:bg-primary-600 focus-ring",
                "disabled:opacity-50"
              )}
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {/* Store filter and search */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-muted-foreground mb-1 block">Store Filter</label>
                <select
                  value={selectedStoreId || ""}
                  onChange={(e) => setSelectedStoreId(e.target.value || null)}
                  className={cn(
                    "w-full px-4 py-2 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring"
                  )}
                >
                  <option value="">All Stores</option>
                  {allStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-muted-foreground mb-1 block">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className={cn(
                    "w-full px-4 py-2 rounded-xl",
                    "bg-muted border-2 border-transparent",
                    "focus:border-primary-500 focus:bg-card",
                    "focus-ring"
                  )}
                />
              </div>
            </div>
            {selectedStoreId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={missingOnly}
                  onChange={(e) => setMissingOnly(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-muted-foreground">
                  Show only items without variants for this store
                </span>
              </label>
            )}
          </div>

          {/* Category Tabs */}
          <div className="mb-4 overflow-x-auto">
            <div className="flex gap-2 pb-2 min-w-max">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap",
                  "transition-colors",
                  selectedCategoryId === null
                    ? "bg-primary-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                All ({items.length})
              </button>
              {categories
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((category) => {
                  const categoryItemsCount = items.filter(
                    (item) => item.category.id === category.id
                  ).length;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap",
                        "transition-colors",
                        selectedCategoryId === category.id
                          ? "bg-primary-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {category.name} ({categoryItemsCount})
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium">Icon</th>
                    <th className="px-4 py-3 text-sm font-medium">Item</th>
                    <th className="px-4 py-3 text-sm font-medium">Category</th>
                    {selectedStoreId ? (
                      <>
                        <th className="px-4 py-3 text-sm font-medium">Variant Name</th>
                        <th className="px-4 py-3 text-sm font-medium">Price</th>
                        <th className="px-4 py-3 text-sm font-medium">Barcode</th>
                        <th className="px-4 py-3 text-sm font-medium">Actions</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-sm font-medium">Est. Price</th>
                        <th className="px-4 py-3 text-sm font-medium">Active</th>
                        <th className="px-4 py-3 text-sm font-medium">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={selectedStoreId ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                        No items found
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isSaving = savingVariants.has(item.id);
                      const variant = item.storeVariant;
                      
                      return selectedStoreId ? (
                        <InlineVariantRow
                          key={item.id}
                          item={item}
                          variant={variant}
                          isSaving={isSaving}
                          onSave={handleSaveInlineVariant}
                          onClear={handleClearVariant}
                        />
                      ) : (
                        <tr key={item.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-2xl">{item.icon || "🛒"}</td>
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.category.name}
                          </td>
                          <td className="px-4 py-3">
                            {item.estimatedPrice !== null ? (
                              <span className="font-medium">
                                ${item.estimatedPrice.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleItemActive(item)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                item.isActive
                                  ? "bg-accent-100 dark:bg-accent-900 text-accent-600"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => openVariantsModal(item)}
                                className="p-1.5 rounded hover:bg-muted"
                                title="View stores & variants"
                              >
                                <Store className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openItemModal(item)}
                                className="p-1.5 rounded hover:bg-muted"
                                title="Edit item"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                                title="Delete item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCategoryModal(false)}
          />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? "Edit Category" : "New Category"}
            </h3>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Category name"
              className={cn(
                "w-full px-4 py-2.5 rounded-xl mb-4",
                "bg-muted border-2 border-transparent",
                "focus:border-primary-500 focus:bg-card",
                "focus-ring"
              )}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-muted font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryName.trim() || formLoading}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-medium",
                  "bg-primary-500 text-white",
                  "disabled:opacity-50"
                )}
              >
                {formLoading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowItemModal(false)}
          />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? "Edit Item" : "New Item"}
            </h3>
            <div className="space-y-3 mb-4">
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Item name"
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl",
                  "bg-muted border-2 border-transparent",
                  "focus:border-primary-500 focus:bg-card",
                  "focus-ring"
                )}
                autoFocus
              />
              <input
                type="text"
                value={itemIcon}
                onChange={(e) => setItemIcon(e.target.value)}
                placeholder="Emoji icon (e.g. 🍎)"
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl",
                  "bg-muted border-2 border-transparent",
                  "focus:border-primary-500 focus:bg-card",
                  "focus-ring"
                )}
              />
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl",
                  "bg-muted border-2 border-transparent",
                  "focus:border-primary-500 focus:bg-card",
                  "focus-ring"
                )}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowItemModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-muted font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={!itemName.trim() || !itemCategoryId || formLoading}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-medium",
                  "bg-primary-500 text-white",
                  "disabled:opacity-50"
                )}
              >
                {formLoading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variants Modal */}
      {showVariantsModal && selectedItemForVariants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowVariantsModal(false);
              setShowVariantForm(false);
            }}
          />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">
                  Stores & Products: {selectedItemForVariants.icon} {selectedItemForVariants.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage product variants across different stores
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVariantsModal(false);
                  setShowVariantForm(false);
                }}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error display in modal */}
            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {variantsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {!showVariantForm && (
                  <button
                    onClick={() => openVariantForm()}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                      "bg-primary-500 text-white font-medium text-sm",
                      "hover:bg-primary-600 focus-ring"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Add Product Variant
                  </button>
                )}

                {showVariantForm && (
                  <div className="bg-muted rounded-xl p-4 space-y-3 mb-4">
                    <h4 className="font-semibold">
                      {editingVariant ? "Edit Variant" : "New Variant"}
                    </h4>
                    <select
                      value={variantStoreId}
                      onChange={(e) => setVariantStoreId(e.target.value)}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl",
                        "bg-card border-2 border-transparent",
                        "focus:border-primary-500 focus-ring"
                      )}
                    >
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      placeholder="Product name (e.g., Gala Apples)"
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl",
                        "bg-card border-2 border-transparent",
                        "focus:border-primary-500 focus-ring"
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={variantPrice}
                          onChange={(e) => setVariantPrice(e.target.value)}
                          placeholder="0.00"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-card border-2 border-transparent",
                            "focus:border-primary-500 focus-ring"
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Barcode</label>
                        <input
                          type="text"
                          value={variantBarcode}
                          onChange={(e) => setVariantBarcode(e.target.value)}
                          placeholder="Optional"
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl",
                            "bg-card border-2 border-transparent",
                            "focus:border-primary-500 focus-ring"
                          )}
                        />
                      </div>
                    </div>
                    <input
                      type="url"
                      value={variantImageUrl}
                      onChange={(e) => setVariantImageUrl(e.target.value)}
                      placeholder="Image URL (optional)"
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl",
                        "bg-card border-2 border-transparent",
                        "focus:border-primary-500 focus-ring"
                      )}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowVariantForm(false);
                          setEditingVariant(null);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-muted font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveVariant}
                        disabled={!variantName.trim() || !variantStoreId || formLoading}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl font-medium",
                          "bg-primary-500 text-white",
                          "disabled:opacity-50"
                        )}
                      >
                        {formLoading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Debug info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-4 p-3 bg-muted rounded-lg text-xs">
                    <div>Total variants: {variants.length}</div>
                    <div>Total stores: {stores.length}</div>
                    <div>Selected item ID: {selectedItemForVariants.id}</div>
                    <details className="mt-2">
                      <summary className="cursor-pointer">View variants data</summary>
                      <pre className="mt-2 overflow-auto max-h-40">
                        {JSON.stringify(variants, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Group variants by store */}
                {stores.map((store) => {
                  const storeVariants = variants.filter((v) => v.storeId === store.id);
                  return (
                    <div
                      key={store.id}
                      className="bg-muted rounded-xl p-4 border border-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-5 h-5 text-primary-500" />
                          <h4 className="font-semibold">{store.name}</h4>
                          <span className="text-sm text-muted-foreground">
                            ({storeVariants.length} variant{storeVariants.length !== 1 ? "s" : ""})
                          </span>
                          {process.env.NODE_ENV === 'development' && (
                            <span className="text-xs text-muted-foreground">(ID: {store.id})</span>
                          )}
                        </div>
                        {!showVariantForm && (
                          <button
                            onClick={() => openVariantForm(undefined, store.id)}
                            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                          >
                            + Add Variant
                          </button>
                        )}
                      </div>

                      {storeVariants.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No variants for this store
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {storeVariants.map((variant) => (
                            <div
                              key={variant.id}
                              className="bg-card rounded-lg p-3 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {variant.imageUrl && (
                                  <img
                                    src={variant.imageUrl}
                                    alt={variant.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="font-medium">{variant.name}</div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    {variant.price !== null && (
                                      <span className="flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        ${variant.price.toFixed(2)}
                                      </span>
                                    )}
                                    {variant.barcode && (
                                      <span>Barcode: {variant.barcode}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!showVariantForm && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openVariantForm(variant)}
                                    className="p-1.5 rounded hover:bg-muted"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVariant(variant.id)}
                                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
