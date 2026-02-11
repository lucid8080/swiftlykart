import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/lib/zod";

const recommendationsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, "At least one item ID is required"),
});

interface RecommendationItem {
  id: string;
  name: string;
  icon: string | null;
}

interface StoreRecommendation {
  storeId: string;
  storeName: string;
  items: RecommendationItem[];
}

interface RecommendationsResponse {
  recommendations: StoreRecommendation[];
  notFound: RecommendationItem[];
}

/**
 * POST /api/recommendations
 * Returns store recommendations for items that were not found
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<RecommendationsResponse>>> {
  try {
    const body = await request.json();

    // Validate input
    const validation = recommendationsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { itemIds } = validation.data;

    // Check if Store/ProductVariant tables exist by trying to query them
    let variants: Array<{
      storeId: string;
      store: { id: string; name: string };
      groceryItem: { id: string; name: string; icon: string | null };
    }> = [];

    try {
      variants = await prisma.productVariant.findMany({
        where: {
          groceryItemId: { in: itemIds },
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          groceryItem: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      // If Store/ProductVariant tables don't exist (migration not run), return empty
      const prismaError = error as { code?: string; message?: string };
      if (
        prismaError?.code === "P2001" ||
        prismaError?.message?.includes("does not exist") ||
        error?.message?.includes("Store") ||
        error?.message?.includes("ProductVariant")
      ) {
        console.log("Store/ProductVariant tables don't exist yet, returning empty recommendations");
        // Get the items that were requested to show them in notFound
        const requestedItems = await prisma.groceryItem.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, name: true, icon: true },
        });

        return NextResponse.json({
          success: true,
          data: {
            recommendations: [],
            notFound: requestedItems,
          },
        });
      }
      throw error;
    }

    // Get all requested items to determine which ones weren't found
    const requestedItems = await prisma.groceryItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, name: true, icon: true },
    });

    // Group variants by store
    const storeMap = new Map<string, StoreRecommendation>();

    variants.forEach((variant) => {
      const storeId = variant.store.id;
      const storeName = variant.store.name;

      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          storeId,
          storeName,
          items: [],
        });
      }

      const recommendation = storeMap.get(storeId)!;
      // Avoid duplicates - check if item already exists in this store's items
      const itemExists = recommendation.items.some(
        (item) => item.id === variant.groceryItem.id
      );
      if (!itemExists) {
        recommendation.items.push({
          id: variant.groceryItem.id,
          name: variant.groceryItem.name,
          icon: variant.groceryItem.icon,
        });
      }
    });

    // Find items that don't have any store variants
    const foundItemIds = new Set(
      variants.map((v) => v.groceryItem.id)
    );
    const notFound = requestedItems.filter(
      (item) => !foundItemIds.has(item.id)
    );

    // Convert map to array and sort by number of items (most items first)
    const recommendations = Array.from(storeMap.values()).sort(
      (a, b) => b.items.length - a.items.length
    );

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        notFound,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch recommendations: ${err?.message || "Unknown error"}`,
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
