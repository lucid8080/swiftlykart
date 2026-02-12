import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveCurrentList, clearListItems } from "@/lib/list";
import { prisma } from "@/lib/db";
import { checkoutSchema, type ApiResponse } from "@/lib/zod";

/**
 * POST /api/checkout
 * Handles checkout flow: CLEAR, SAVE_AND_CLEAR, or KEEP
 * Returns requiresAuth=true if guest tries to save
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ requiresAuth?: boolean; saved?: boolean; cleared?: boolean }>>> {
  try {
    // Validate request body
    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

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

    const { outcome, action } = validation.data;

    // Get current list
    const list = await resolveCurrentList();
    if (!list) {
      return NextResponse.json(
        {
          success: false,
          error: "No list found. Please log in or enter a PIN.",
          code: "NO_LIST",
        },
        { status: 401 }
      );
    }

    // Get active items count
    const activeItems = list.items.filter((item) => item.active);
    if (activeItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "List is already empty",
          code: "EMPTY_LIST",
        },
        { status: 400 }
      );
    }

    // State machine logic
    if (outcome === "MISSING_ITEMS") {
      // Default: KEEP (no clearing)
      if (action === "KEEP") {
        return NextResponse.json({
          success: true,
          data: { cleared: false },
        });
      }
      // Invalid: can't clear or save when items are missing
      return NextResponse.json(
        {
          success: false,
          error: "Cannot clear or save when items are missing",
          code: "INVALID_ACTION",
        },
        { status: 400 }
      );
    }

    // outcome === "FOUND_ALL"
    if (action === "CLEAR") {
      // Clear list (works for everyone)
      await clearListItems(list.id);
      return NextResponse.json({
        success: true,
        data: { cleared: true },
      });
    }

    if (action === "SAVE_AND_CLEAR") {
      // Check if user is logged in
      const session = await auth();
      if (!session?.user?.id) {
        // Guest trying to save - return requiresAuth
        return NextResponse.json({
          success: true,
          data: { requiresAuth: true },
        });
      }

      // User is logged in - save snapshot then clear
      const userId = session.user.id;

      // Generate title with date
      const now = new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const title = `Grocery Run – ${monthNames[now.getMonth()]} ${now.getDate()}`;

      // Create saved list with items
      await prisma.$transaction(async (tx) => {
        // Create SavedList
        const savedList = await tx.savedList.create({
          data: {
            ownerUserId: userId,
            title,
          },
        });

        // Create SavedListItems from active ListItems
        await Promise.all(
          activeItems.map((item) =>
            tx.savedListItem.create({
              data: {
                savedListId: savedList.id,
                groceryItemId: item.groceryItemId,
                productVariantId: item.productVariantId || null,
              },
            })
          )
        );
      });

      // Clear the active list
      await clearListItems(list.id);

      return NextResponse.json({
        success: true,
        data: { saved: true, cleared: true },
      });
    }

    // Invalid action
    return NextResponse.json(
      {
        success: false,
        error: "Invalid action for this outcome",
        code: "INVALID_ACTION",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in checkout:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process checkout",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
