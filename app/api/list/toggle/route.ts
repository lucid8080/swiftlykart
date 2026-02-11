import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveCurrentList, toggleListItem } from "@/lib/list";
import { toggleItemSchema, type ApiResponse } from "@/lib/zod";

/**
 * POST /api/list/toggle
 * Toggles a grocery item's selection state in the current list
 */
export async function POST(request: Request): Promise<NextResponse<ApiResponse<{ active: boolean }>>> {
  try {
    const body = await request.json();

    // Validate input
    const validation = toggleItemSchema.safeParse(body);
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

    const { groceryItemId, productVariantId } = validation.data;

    // Verify grocery item exists
    const groceryItem = await prisma.groceryItem.findUnique({
      where: { id: groceryItemId },
    });

    if (!groceryItem) {
      return NextResponse.json(
        { success: false, error: "Grocery item not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // If productVariantId is provided, verify it exists and matches the grocery item
    if (productVariantId) {
      try {
        const variant = await prisma.productVariant.findUnique({
          where: { id: productVariantId },
        });

        if (!variant || variant.groceryItemId !== groceryItemId) {
          return NextResponse.json(
            { success: false, error: "Product variant not found or doesn't match item", code: "NOT_FOUND" },
            { status: 404 }
          );
        }
      } catch (error: any) {
        // If ProductVariant table doesn't exist (migration not applied), ignore productVariantId
        if (error?.code === 'P2001' || error?.message?.includes('ProductVariant') || error?.message?.includes('does not exist')) {
          // Continue without variant validation - will be handled in toggleListItem
        } else {
          throw error;
        }
      }
    }

    // Get current list
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

    // Toggle item
    const result = await toggleListItem(list.id, groceryItemId, productVariantId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error toggling item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to toggle item", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
