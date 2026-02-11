import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { appSettingsSchema, type ApiResponse, type AppSettings } from "@/lib/zod";

/**
 * GET /api/admin/settings
 * Returns current app settings (admin only)
 */
export async function GET(): Promise<NextResponse<ApiResponse<AppSettings>>> {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const config = await prisma.appConfig.findUnique({
      where: { id: "global" },
    });

    // If config doesn't exist, create it with defaults
    if (!config) {
      const newConfig = await prisma.appConfig.create({
        data: {
          id: "global",
          showPriceRange: true,
        },
      });
      return NextResponse.json({
        success: true,
        data: {
          showPriceRange: newConfig.showPriceRange,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        showPriceRange: config.showPriceRange,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings
 * Updates app settings (admin only)
 * Body: { showPriceRange: boolean }
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AppSettings>>> {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: "Admin access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = appSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors.map((e) => e.message).join(", "),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { showPriceRange } = validation.data;

    // Upsert the global config
    const config = await prisma.appConfig.upsert({
      where: { id: "global" },
      update: { showPriceRange },
      create: {
        id: "global",
        showPriceRange,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        showPriceRange: config.showPriceRange,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
