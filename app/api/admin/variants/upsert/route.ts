import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { z } from "zod";
import type { ApiResponse } from "@/lib/zod";

const upsertVariantSchema = z.object({
  groceryItemId: z.string().uuid(),
  storeId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  price: z.number().positive("Price must be positive").nullable(),
  barcode: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

/**
 * POST /api/admin/variants/upsert
 * Creates or updates a product variant for a specific item+store pair (admin only)
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
    const validation = upsertVariantSchema.safeParse(body);

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

    const data = validation.data;

    // Clean up imageUrl - convert empty string to null
    let imageUrl = data.imageUrl;
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

    // Clean up barcode - convert empty string to null
    const barcode = data.barcode === "" || data.barcode === null || data.barcode === undefined
      ? null
      : data.barcode;

    // Upsert: find existing variant or create new one
    const variant = await prisma.productVariant.upsert({
      where: {
        groceryItemId_storeId: {
          groceryItemId: data.groceryItemId,
          storeId: data.storeId,
        },
      },
      update: {
        name: data.name,
        price: data.price,
        barcode: barcode,
        imageUrl: imageUrl,
      },
      create: {
        groceryItemId: data.groceryItemId,
        storeId: data.storeId,
        name: data.name,
        price: data.price,
        barcode: barcode,
        imageUrl: imageUrl,
      },
      include: {
        store: {
          select: { id: true, name: true, logo: true },
        },
        groceryItem: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: variant }, { status: 200 });
  } catch (error: any) {
    console.error("Error upserting variant:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });

    if (error.code === "P2002") {
      const field = error.meta?.target?.join(", ") || "fields";
      return NextResponse.json(
        { success: false, error: `A variant with this ${field} already exists`, code: "DUPLICATE" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to upsert variant", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
