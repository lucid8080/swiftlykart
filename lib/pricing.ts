import type { PriceRange, VariantsBatchItem } from "@/lib/zod";

interface VariantInfo {
  id: string;
  storeId: string;
  price: number | null;
  name: string;
}

interface StoreInfo {
  id: string;
  name: string;
  logo: string | null;
}

/**
 * For each store, compute the total cost of buying the cheapest variant
 * of every list item at that store. If a store is missing a variant for
 * ANY item, it is not eligible.
 *
 * Returns:
 * - eligibleTotalsByStoreId: Map<storeId, total>
 * - missingByStoreId: Map<storeId, Set<groceryItemId>> (items missing per store)
 */
export function computeStoreTotals(
  listItemIds: string[],
  variantsByItemId: Map<string, VariantInfo[]>
): {
  eligibleTotalsByStoreId: Map<string, number>;
  missingByStoreId: Map<string, Set<string>>;
} {
  // Collect all storeIds across all variants
  const allStoreIds = new Set<string>();
  for (const variants of variantsByItemId.values()) {
    for (const v of variants) {
      if (v.price !== null) allStoreIds.add(v.storeId);
    }
  }

  const eligibleTotalsByStoreId = new Map<string, number>();
  const missingByStoreId = new Map<string, Set<string>>();

  for (const storeId of allStoreIds) {
    let total = 0;
    let eligible = true;
    const missing = new Set<string>();

    for (const itemId of listItemIds) {
      const variants = variantsByItemId.get(itemId) || [];
      // Find cheapest variant at this store for this item
      const storeVariants = variants.filter(
        (v) => v.storeId === storeId && v.price !== null
      );

      if (storeVariants.length === 0) {
        // This store doesn't carry this item
        eligible = false;
        missing.add(itemId);
      } else {
        // Pick the cheapest
        const cheapest = storeVariants.reduce((min, v) =>
          (v.price ?? Infinity) < (min.price ?? Infinity) ? v : min
        );
        total += cheapest.price!;
      }
    }

    if (eligible) {
      eligibleTotalsByStoreId.set(storeId, total);
    }
    if (missing.size > 0) {
      missingByStoreId.set(storeId, missing);
    }
  }

  return { eligibleTotalsByStoreId, missingByStoreId };
}

/**
 * Compute the estimated price range.
 *
 * Mode B: Per-store totals using cheapest variant per item per store.
 *
 * - If ≥1 eligible store: MIN/MAX of store totals → coverageMode = "store_total"
 * - If 0 eligible stores: per-item min/max fallback → coverageMode = "per_item_fallback"
 */
export function computePriceRange(
  listItemIds: string[],
  variantsByItemId: Map<string, VariantInfo[]>,
  storesById: Map<string, StoreInfo>
): PriceRange | null {
  if (listItemIds.length === 0) return null;

  const { eligibleTotalsByStoreId } = computeStoreTotals(
    listItemIds,
    variantsByItemId
  );

  if (eligibleTotalsByStoreId.size > 0) {
    // At least one store covers all items
    let minTotal = Infinity;
    let maxTotal = -Infinity;
    let minStoreId: string | null = null;
    let maxStoreId: string | null = null;

    for (const [storeId, total] of eligibleTotalsByStoreId) {
      if (total < minTotal) {
        minTotal = total;
        minStoreId = storeId;
      }
      if (total > maxTotal) {
        maxTotal = total;
        maxStoreId = storeId;
      }
    }

    return {
      minTotal,
      maxTotal,
      minStoreId,
      maxStoreId,
      minStoreName: minStoreId ? (storesById.get(minStoreId)?.name ?? null) : null,
      maxStoreName: maxStoreId ? (storesById.get(maxStoreId)?.name ?? null) : null,
      coverageMode: "store_total",
    };
  }

  // Fallback: per-item min/max (no single store has everything)
  let totalMin = 0;
  let totalMax = 0;
  let hasAnyPrice = false;

  for (const itemId of listItemIds) {
    const variants = variantsByItemId.get(itemId) || [];
    const priced = variants.filter((v) => v.price !== null && v.price > 0);

    if (priced.length === 0) {
      // No price data for this item — skip (0 contribution)
      continue;
    }

    hasAnyPrice = true;
    const prices = priced.map((v) => v.price!);
    totalMin += Math.min(...prices);
    totalMax += Math.max(...prices);
  }

  if (!hasAnyPrice) return null;

  return {
    minTotal: totalMin,
    maxTotal: totalMax,
    minStoreId: null,
    maxStoreId: null,
    minStoreName: null,
    maxStoreName: null,
    coverageMode: "per_item_fallback",
  };
}

/**
 * Builds a Map from an array of VariantsBatchItem.
 */
export function buildVariantsByItemId(
  items: VariantsBatchItem[]
): Map<string, VariantInfo[]> {
  const map = new Map<string, VariantInfo[]>();
  for (const item of items) {
    map.set(item.groceryItemId, item.variants);
  }
  return map;
}

/**
 * Builds a Map of stores by ID.
 */
export function buildStoresById(
  stores: StoreInfo[]
): Map<string, StoreInfo> {
  const map = new Map<string, StoreInfo>();
  for (const store of stores) {
    map.set(store.id, store);
  }
  return map;
}
