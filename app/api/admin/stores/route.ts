import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import type { ApiResponse } from "@/lib/zod";

/**
 * GET /api/admin/stores
 * Returns all stores (admin only)
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const stores = await prisma.store.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        logo: true,
      },
    });

    return NextResponse.json({ success: true, data: stores });
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stores", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
