import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { updateCategorySchema, type ApiResponse } from "@/lib/zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/categories/[id]
 * Updates a category (admin only)
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
    
    const validation = updateCategorySchema.safeParse(body);
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

    const category = await prisma.category.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update category", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * Deletes a category (admin only)
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
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete category", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
