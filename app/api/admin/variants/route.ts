import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { z } from "zod";
import type { ApiResponse } from "@/lib/zod";

const createVariantSchema = z.object({
  groceryItemId: z.string().uuid(),
  storeId: z.string().uuid(),
  name: z.string().min(1),
  price: z.union([z.number().positive(), z.null()]).optional(),
  imageUrl: z.union([
    z.string().url(),
    z.string().length(0),
    z.null()
  ]).optional(),
  barcode: z.string().nullable().optional(),
});

const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  barcode: z.string().nullable().optional(),
});

/**
 * POST /api/admin/variants
 * Creates a new product variant (admin only)
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
    const validation = createVariantSchema.safeParse(body);
    
    if (!validation.success) {
      console.error("Validation error:", validation.error.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), 
          code: "VALIDATION_ERROR" 
        },
        { status: 400 }
      );
    }

    // Clean up the data - convert empty strings to null and validate imageUrl
    let imageUrl = validation.data.imageUrl;
    if (imageUrl === "" || imageUrl === null || imageUrl === undefined) {
      imageUrl = null;
    } else if (typeof imageUrl === "string" && imageUrl.length > 0) {
      // Validate URL format
      try {
        new URL(imageUrl);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid image URL format", code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }
    }

    // Build clean data object - only include barcode if it has a value
    const cleanData: any = {
      groceryItemId: validation.data.groceryItemId,
      storeId: validation.data.storeId,
      name: validation.data.name,
      price: validation.data.price === null || validation.data.price === undefined ? null : validation.data.price,
      imageUrl: imageUrl,
    };

    // Only include barcode if it's not null/empty (in case Prisma client doesn't support it yet)
    const barcodeValue = validation.data.barcode === null || validation.data.barcode === undefined || validation.data.barcode === "" ? null : validation.data.barcode;
    if (barcodeValue !== null) {
      cleanData.barcode = barcodeValue;
    }

    const variant = await prisma.productVariant.create({
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

    return NextResponse.json({ success: true, data: variant }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating variant:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
    
    if (error.code === "P2002") {
      const field = error.meta?.target?.join(', ') || 'fields';
      return NextResponse.json(
        { success: false, error: `A variant with this ${field} already exists`, code: "DUPLICATE" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create variant", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
