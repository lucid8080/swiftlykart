import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { groceryItemSchema, type ApiResponse, type GroceryItemInput } from "@/lib/zod";

/**
 * GET /api/admin/items?storeId=...&q=...&categoryId=...&page=...&pageSize=...
 * Returns all grocery items with categories (admin only)
 * If storeId is provided, includes storeVariant for that store
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get("storeId");
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "100");
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // If storeId is provided, include the variant for that store
    const include: Record<string, unknown> = {
      category: {
        select: { id: true, name: true },
      },
    };

    if (storeId) {
      include.productVariants = {
        where: { storeId },
        select: {
          id: true,
          storeId: true,
          name: true,
          price: true,
          barcode: true,
          imageUrl: true,
        },
        take: 1, // Only one variant per item+store (enforced by unique constraint)
      };
    } else {
      // Without storeId, calculate estimated price (average)
      include.productVariants = {
        where: {
          price: { not: null },
        },
        select: {
          price: true,
        },
      };
    }

    const [items, total] = await Promise.all([
      prisma.groceryItem.findMany({
        where,
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        include,
        skip,
        take: pageSize,
      }),
      prisma.groceryItem.count({ where }),
    ]);

    // Transform items based on whether storeId is provided
    const transformedItems = items.map((item) => {
      if (storeId) {
        // Map variants[0] -> storeVariant
        const storeVariant = item.productVariants[0] || null;
        const { productVariants, ...itemWithoutVariants } = item;
        return {
          ...itemWithoutVariants,
          storeVariant,
        };
      } else {
        // Calculate estimated price (average)
        let estimatedPrice: number | null = null;
        if (item.productVariants.length > 0) {
          const prices = (item.productVariants as Array<{ price: number | null }>)
            .map((v) => v.price)
            .filter((p): p is number => p !== null);
          if (prices.length > 0) {
            const sum = prices.reduce((acc, p) => acc + p, 0);
            estimatedPrice = sum / prices.length;
          }
        }
        const { productVariants, ...itemWithoutVariants } = item;
        return {
          ...itemWithoutVariants,
          estimatedPrice,
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: transformedItems,
      pagination: {
        page,
        pageSize,
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch items", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/items
 * Creates a new grocery item (admin only)
 */
export async function POST(request: Request): Promise<NextResponse<ApiResponse>> {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = groceryItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error.errors[0].message, 
          code: "VALIDATION_ERROR" 
        },
        { status: 400 }
      );
    }

    const data: GroceryItemInput = validation.data;
    const item = await prisma.groceryItem.create({
      data,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create item", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
