import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/items/variants-batch?ids=id1,id2,id3
 * Returns product variants grouped by groceryItemId, plus all related stores.
 * Uses a single IN-clause query for performance.
 */
export async function GET(request: NextRequest) {
  try {
    const idsParam = request.nextUrl.searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: "ids query param is required" },
        { status: 400 }
      );
    }

    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        data: { items: [], stores: [] },
      });
    }

    // Cap at 100 IDs to prevent abuse
    if (ids.length > 100) {
      return NextResponse.json(
        { success: false, error: "Maximum 100 IDs allowed" },
        { status: 400 }
      );
    }

    // Single query with IN clause — fast and efficient
    const variants = await prisma.productVariant.findMany({
      where: {
        groceryItemId: { in: ids },
      },
      select: {
        id: true,
        groceryItemId: true,
        storeId: true,
        name: true,
        price: true,
        store: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: { price: "asc" },
    });

    // Group variants by groceryItemId
    const itemMap = new Map<
      string,
      { id: string; storeId: string; price: number | null; name: string }[]
    >();
    const storeMap = new Map<
      string,
      { id: string; name: string; logo: string | null }
    >();

    for (const v of variants) {
      // Group by item
      if (!itemMap.has(v.groceryItemId)) {
        itemMap.set(v.groceryItemId, []);
      }
      itemMap.get(v.groceryItemId)!.push({
        id: v.id,
        storeId: v.storeId,
        price: v.price,
        name: v.name,
      });

      // Collect unique stores
      if (!storeMap.has(v.store.id)) {
        storeMap.set(v.store.id, {
          id: v.store.id,
          name: v.store.name,
          logo: v.store.logo,
        });
      }
    }

    const items = ids.map((id) => ({
      groceryItemId: id,
      variants: itemMap.get(id) || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        stores: Array.from(storeMap.values()),
      },
    });
  } catch (error) {
    console.error("[Variants Batch] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
