import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidJobSecret } from "@/lib/feature-flags";

/**
 * GET /api/internal/health
 * Internal health check endpoint guarded by INTERNAL_JOB_SECRET.
 * Verifies DB connection and returns row counts for key tables.
 */
export async function GET(req: NextRequest) {
  // Validate secret
  const secret = req.headers.get("x-internal-secret");
  if (!isValidJobSecret(secret)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Run count queries in parallel to verify DB connection
    const [tapEventCount, myListItemCount, myListCount, userCount] =
      await Promise.all([
        prisma.tapEvent.count(),
        prisma.myListItem.count(),
        prisma.myList.count(),
        prisma.user.count(),
      ]);

    return NextResponse.json({
      ok: true,
      counts: {
        tapEvents: tapEventCount,
        myListItems: myListItemCount,
        myLists: myListCount,
        users: userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Health Check] Error:", message);
    return NextResponse.json(
      {
        ok: false,
        error: "Database connection failed",
        details: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
