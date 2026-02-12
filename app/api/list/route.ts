import { NextResponse } from "next/server";
import { resolveCurrentList } from "@/lib/list";
import type { ApiResponse, ListWithItems } from "@/lib/zod";
import { prisma } from "@/lib/db";

// Type helper for list items with optional productVariant
type ListItemWithVariant = {
  id: string;
  groceryItemId: string;
  productVariantId?: string | null;
  active: boolean;
  groceryItem: {
    id: string;
    name: string;
    icon: string | null;
    category: {
      id: string;
      name: string;
    };
  };
  productVariant?: {
    id: string;
    name: string | null;
    imageUrl: string | null;
    price: number | null;
    store: {
      id: string;
      name: string;
      logo: string | null;
    } | null;
  } | null;
};

/**
 * GET /api/list
 * Returns the current user's list (by session, device, or PIN)
 */
export async function GET(): Promise<NextResponse<ApiResponse<ListWithItems | null>>> {
  try {
    const list = await resolveCurrentList();

    if (!list) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No list found. Please log in or enter a PIN.", 
          code: "NO_IDENTITY" 
        },
        { status: 401 }
      );
    }

    // Batch price calculations for generic items (items without product variants)
    // Get all groceryItemIds that need price calculation
    const itemsNeedingPrice = list.items.filter(
      (item) => !(item as ListItemWithVariant).productVariant
    );
    const groceryItemIdsNeedingPrice = itemsNeedingPrice.map(
      (item) => item.groceryItemId
    );

    // Single batch query to get all prices at once
    const priceMap = new Map<string, number>();
    if (groceryItemIdsNeedingPrice.length > 0) {
      try {
        const allVariants = await prisma.productVariant.findMany({
          where: {
            groceryItemId: { in: groceryItemIdsNeedingPrice },
            price: { not: null },
          },
          select: { groceryItemId: true, price: true },
        });

        // Group by groceryItemId and calculate averages
        const pricesByItem = new Map<string, number[]>();
        allVariants.forEach((variant) => {
          if (variant.price !== null) {
            const existing = pricesByItem.get(variant.groceryItemId) || [];
            existing.push(variant.price);
            pricesByItem.set(variant.groceryItemId, existing);
          }
        });

        // Calculate averages
        pricesByItem.forEach((prices, groceryItemId) => {
          if (prices.length > 0) {
            const sum = prices.reduce((acc, p) => acc + p, 0);
            priceMap.set(groceryItemId, sum / prices.length);
          }
        });
      } catch (error) {
        // If ProductVariant table doesn't exist, price remains null
        console.log("Could not calculate average prices:", error);
      }
    }

    // Map items with prices
    const itemsWithPrices = list.items.map((item) => {
        let price = null;
        
        // If item has a product variant, use its price
        const itemWithVariant = item as ListItemWithVariant;
        if (itemWithVariant.productVariant) {
          price = itemWithVariant.productVariant.price ?? null;
        } else {
          // Use pre-calculated price from batch query
          price = priceMap.get(item.groceryItemId) ?? null;
        }

        const baseItem = {
          id: item.id,
          groceryItemId: item.groceryItemId,
          productVariantId: itemWithVariant.productVariantId || null,
          active: item.active,
          groceryItem: {
            id: item.groceryItem.id,
            name: item.groceryItem.name,
            icon: item.groceryItem.icon,
            category: item.groceryItem.category,
          },
        };

        let productVariant: {
          id: string;
          name: string;
          imageUrl: string | null;
          price: number | null;
          store: { id: string; name: string };
        } | undefined;

        if (itemWithVariant.productVariant && itemWithVariant.productVariant.store) {
          productVariant = {
            id: itemWithVariant.productVariant.id,
            name: itemWithVariant.productVariant.name || '',
            imageUrl: itemWithVariant.productVariant.imageUrl,
            price: itemWithVariant.productVariant.price ?? null,
            store: {
              id: itemWithVariant.productVariant.store.id,
              name: itemWithVariant.productVariant.store.name,
            },
          };
        } else if (price !== null) {
          // For generic items with calculated average price, create a synthetic variant
          productVariant = {
            id: `generic-${item.groceryItemId}`,
            name: `Generic ${item.groceryItem.name}`,
            imageUrl: null,
            price: price,
            store: { id: '', name: '' },
          };
        }

        return {
          ...baseItem,
          ...(productVariant !== undefined && { productVariant }),
        };
      });

    const formattedList: ListWithItems = {
      id: list.id,
      name: list.name,
      items: itemsWithPrices,
    };

    return NextResponse.json({ success: true, data: formattedList });
  } catch (error) {
    console.error("Error fetching list:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch list", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
