import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { z } from "zod";
import type { ApiResponse } from "@/lib/zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.union([z.number().positive(), z.null()]).optional(),
  imageUrl: z.union([
    z.string().url(),
    z.string().length(0),
    z.null()
  ]).optional(),
  barcode: z.string().nullable().optional(),
});

/**
 * PUT /api/admin/variants/[id]
 * Updates a product variant (admin only)
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
    const validation = updateVariantSchema.safeParse(body);
    
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

    // Clean up the data - convert empty strings to null
    const cleanData: Record<string, unknown> = {};
    if (validation.data.name !== undefined) cleanData.name = validation.data.name;
    if (validation.data.price !== undefined) {
      cleanData.price = validation.data.price === null ? null : validation.data.price;
    }
    if (validation.data.imageUrl !== undefined) {
      const imageUrl = validation.data.imageUrl === null || validation.data.imageUrl === "" ? null : validation.data.imageUrl;
      if (imageUrl !== null) {
        // Validate URL format if provided
        try {
          new URL(imageUrl);
          cleanData.imageUrl = imageUrl;
        } catch {
          return NextResponse.json(
            { success: false, error: "Invalid image URL format", code: "VALIDATION_ERROR" },
            { status: 400 }
          );
        }
      } else {
        cleanData.imageUrl = null;
      }
    }
    // Only include barcode if it has a value (in case Prisma client doesn't support it yet)
    if (validation.data.barcode !== undefined) {
      const barcodeValue = validation.data.barcode === null || validation.data.barcode === "" ? null : validation.data.barcode;
      if (barcodeValue !== null) {
        cleanData.barcode = barcodeValue;
      }
    }

    const variant = await prisma.productVariant.update({
      where: { id },
      data: cleanData,
      include: {
        store: {
          select: { id: true, name: true, logo: true },
        },
        groceryItem: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: variant });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error("Error updating variant:", error);
    
    if (err.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Variant not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to update variant", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/variants/[id]
 * Deletes a product variant (admin only)
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
    await prisma.productVariant.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting variant:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete variant", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
