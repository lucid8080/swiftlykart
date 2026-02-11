import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiResponse, CategoryWithItems } from "@/lib/zod";

/**
 * GET /api/items
 * Returns all active categories with their active grocery items
 */
export async function GET(): Promise<NextResponse<ApiResponse<CategoryWithItems[]>>> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            icon: true,
            sortOrder: true,
          },
        },
      },
    });

    const formattedCategories: CategoryWithItems[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      items: cat.items,
    }));

    return NextResponse.json(
      { success: true, data: formattedCategories },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch items", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
