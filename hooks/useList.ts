"use client";

import { useState, useEffect, useCallback } from "react";
import { getDeviceHeaders } from "@/lib/device-client";
import type { CategoryWithItems, ListWithItems } from "@/lib/zod";

interface UseListReturn {
  // Data
  categories: CategoryWithItems[];
  list: ListWithItems | null;
  selectedIds: Set<string>;
  selectedVariants: Map<string, string | null>; // groceryItemId -> productVariantId | null
  
  // Actions
  toggleItem: (groceryItemId: string, productVariantId?: string | null) => Promise<void>;
  clearList: () => Promise<void>;
  refreshList: () => Promise<void>;
  refreshItems: () => Promise<void>;
  
  // State
  isLoading: boolean;
  isToggling: string | null; // groceryItemId being toggled
  error: string | null;
  hasIdentity: boolean;
}

export function useList(): UseListReturn {
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [list, setList] = useState<ListWithItems | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedVariants, setSelectedVariants] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasIdentity, setHasIdentity] = useState(true);

  // Fetch items
  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch("/api/items", {
        headers: getDeviceHeaders(),
        cache: "no-store", // Always fetch fresh data
      });
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.error || "Failed to load items");
      }
    } catch {
      setError("Failed to load items");
    }
  }, []);

  // Fetch list
  const fetchList = useCallback(async () => {
    try {
      const response = await fetch("/api/list", {
        headers: getDeviceHeaders(),
      });
      const data = await response.json();
      
      if (data.success) {
        setList(data.data);
        setHasIdentity(true);
        
        // Build selected IDs set and variants map
        const ids = new Set<string>();
        const variants = new Map<string, string | null>();
        data.data.items.forEach((item: { 
          groceryItemId: string; 
          productVariantId: string | null;
        }) => {
          ids.add(item.groceryItemId);
          variants.set(item.groceryItemId, item.productVariantId);
        });
        setSelectedIds(ids);
        setSelectedVariants(variants);
      } else if (data.code === "NO_IDENTITY") {
        setHasIdentity(false);
        setSelectedIds(new Set());
        setSelectedVariants(new Map());
      } else {
        setError(data.error || "Failed to load list");
      }
    } catch {
      setError("Failed to load list");
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchItems(), fetchList()]);
      setIsLoading(false);
    };
    init();
  }, [fetchItems, fetchList]);

  // Toggle item with optimistic update
  const toggleItem = useCallback(async (
    groceryItemId: string,
    productVariantId?: string | null
  ) => {
    if (isToggling) return;

    // Optimistic update
    const wasSelected = selectedIds.has(groceryItemId);
    const newSelectedIds = new Set(selectedIds);
    const newSelectedVariants = new Map(selectedVariants);
    
    if (wasSelected) {
      newSelectedIds.delete(groceryItemId);
      newSelectedVariants.delete(groceryItemId);
    } else {
      newSelectedIds.add(groceryItemId);
      newSelectedVariants.set(groceryItemId, productVariantId || null);
    }
    
    setSelectedIds(newSelectedIds);
    setSelectedVariants(newSelectedVariants);
    setIsToggling(groceryItemId);
    setError(null);

    try {
      const response = await fetch("/api/list/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceHeaders(),
        },
        body: JSON.stringify({ 
          groceryItemId,
          ...(productVariantId && { productVariantId }),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Rollback on failure
        setSelectedIds(selectedIds);
        setSelectedVariants(selectedVariants);
        setError(data.error || "Failed to update item");
      } else {
        // Refresh list to get updated variant data
        await fetchList();
      }
    } catch {
      // Rollback on error
      setSelectedIds(selectedIds);
      setSelectedVariants(selectedVariants);
      setError("Failed to update item");
    } finally {
      setIsToggling(null);
    }
  }, [selectedIds, selectedVariants, isToggling, fetchList]);

  // Clear list
  const clearList = useCallback(async () => {
    const previousIds = selectedIds;
    const previousVariants = selectedVariants;
    setSelectedIds(new Set());
    setSelectedVariants(new Map());
    setError(null);

    try {
      const response = await fetch("/api/list/clear", {
        method: "POST",
        headers: getDeviceHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        // Rollback on failure
        setSelectedIds(previousIds);
        setSelectedVariants(previousVariants);
        setError(data.error || "Failed to clear list");
      } else {
        // Refresh list to get updated data
        await fetchList();
      }
    } catch {
      // Rollback on error
      setSelectedIds(previousIds);
      setSelectedVariants(previousVariants);
      setError("Failed to clear list");
    }
  }, [selectedIds, selectedVariants, fetchList]);

  return {
    categories,
    list,
    selectedIds,
    selectedVariants,
    toggleItem,
    clearList,
    refreshList: fetchList,
    refreshItems: fetchItems,
    isLoading,
    isToggling,
    error,
    hasIdentity,
  };
}
