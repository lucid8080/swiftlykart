import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiResponse, AppSettings } from "@/lib/zod";

/**
 * GET /api/settings/public
 * Returns public app settings (no auth required)
 * Cached for 60 seconds
 */
export async function GET(): Promise<NextResponse<ApiResponse<AppSettings>>> {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: "global" },
    });

    // If config doesn't exist, return defaults
    const showPriceRange = config?.showPriceRange ?? true;

    const response = NextResponse.json({
      success: true,
      data: {
        showPriceRange,
      },
    });

    // Add caching headers (60 seconds in production, no-store in dev)
    if (process.env.NODE_ENV === "production") {
      response.headers.set("Cache-Control", "public, max-age=60");
    } else {
      response.headers.set("Cache-Control", "no-store");
    }

    return response;
  } catch (error) {
    console.error("[GET /api/settings/public] Error:", error);
    // Return defaults on error
    return NextResponse.json({
      success: true,
      data: {
        showPriceRange: true, // Default to true on error
      },
    });
  }
}
