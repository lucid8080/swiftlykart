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

    // Calculate average prices for generic items (items without product variants)
    const itemsWithPrices = await Promise.all(
      list.items.map(async (item) => {
        let price = null;
        
        // If item has a product variant, use its price
        const itemWithVariant = item as ListItemWithVariant;
        if (itemWithVariant.productVariant) {
          price = itemWithVariant.productVariant.price ?? null;
        } else {
          // For generic items, calculate average price from all variants
          try {
            const variants = await prisma.productVariant.findMany({
              where: {
                groceryItemId: item.groceryItemId,
                price: { not: null },
              },
              select: { price: true },
            });

            if (variants.length > 0) {
              const prices = variants
                .map((v) => v.price)
                .filter((p): p is number => p !== null);
              
              if (prices.length > 0) {
                const sum = prices.reduce((acc, p) => acc + p, 0);
                price = sum / prices.length;
              }
            }
          } catch (error) {
            // If ProductVariant table doesn't exist, price remains null
            console.log("Could not calculate average price:", error);
          }
        }

        return {
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
          productVariant: itemWithVariant.productVariant ? {
            id: itemWithVariant.productVariant.id,
            name: itemWithVariant.productVariant.name,
            imageUrl: itemWithVariant.productVariant.imageUrl,
            price: itemWithVariant.productVariant.price ?? null,
            store: itemWithVariant.productVariant.store,
          } : (price !== null ? {
            // For generic items with calculated average price, create a synthetic variant
            id: `generic-${item.groceryItemId}`,
            name: `Generic ${item.groceryItem.name}`,
            imageUrl: null,
            price: price,
            store: { id: '', name: '', logo: null },
          } : null),
        };
      })
    );

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
