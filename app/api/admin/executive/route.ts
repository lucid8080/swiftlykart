import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { isExecutiveViewEnabled } from "@/lib/feature-flags";

/**
 * GET /api/admin/executive
 * Returns aggregated daily site stats for the executive view.
 * Reads ONLY from DailySiteStats (no TapEvent queries).
 * Gated by ENABLE_EXECUTIVE_VIEW feature flag.
 */
export async function GET() {
  // Feature flag check
  if (!isExecutiveViewEnabled()) {
    return NextResponse.json(
      { success: false, error: "Executive view is disabled" },
      { status: 404 }
    );
  }

  // Admin auth check
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Fetch last 30 days of DailySiteStats, ordered by date descending
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

    const rows = await prisma.dailySiteStats.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
    });

    // Compute 30-day KPI totals by summing all rows
    const kpi = rows.reduce(
      (acc, row) => ({
        taps30d: acc.taps30d + row.tapsTotal,
        visitors30d: acc.visitors30d + row.uniqueVisitorsEst,
        purchased30d: acc.purchased30d + row.itemsPurchased,
        lists30d: acc.lists30d + row.listsCreated,
      }),
      { taps30d: 0, visitors30d: 0, purchased30d: 0, lists30d: 0 }
    );

    // Format rows for the client
    const formattedRows = rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      tapsTotal: row.tapsTotal,
      uniqueVisitorsEst: row.uniqueVisitorsEst,
      usersNew: row.usersNew,
      usersActiveEst: row.usersActiveEst,
      listsCreated: row.listsCreated,
      itemsAdded: row.itemsAdded,
      itemsPurchased: row.itemsPurchased,
    }));

    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        rows: formattedRows,
        kpi,
      },
    });
  } catch (error) {
    console.error("[Executive API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
