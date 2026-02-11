import { NextResponse } from "next/server";
import { resolveCurrentList, clearListItems } from "@/lib/list";
import type { ApiResponse } from "@/lib/zod";

/**
 * POST /api/list/clear
 * Clears all items from the current list (marks them inactive)
 */
export async function POST(): Promise<NextResponse<ApiResponse<{ cleared: boolean }>>> {
  try {
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

    // Clear all items
    await clearListItems(list.id);

    return NextResponse.json({ success: true, data: { cleared: true } });
  } catch (error) {
    console.error("Error clearing list:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear list", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
