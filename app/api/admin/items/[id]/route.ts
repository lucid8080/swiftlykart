import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { updateGroceryItemSchema, type ApiResponse } from "@/lib/zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/items/[id]
 * Updates a grocery item (admin only)
 */
export async function PUT(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    const validation = updateGroceryItemSchema.safeParse(body);
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

    const item = await prisma.groceryItem.update({
      where: { id },
      data: validation.data,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update item", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/items/[id]
 * Deletes a grocery item (admin only)
 */
export async function DELETE(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.groceryItem.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete item", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
