import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { isExecutiveViewEnabled } from "@/lib/feature-flags";

/**
 * GET /api/admin/executive/power-users
 * Returns top power users (last 30 days) aggregated from DailyVisitorStats.
 * Reads ONLY from DailyVisitorStats (no TapEvent queries).
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
    const powerUserThreshold = parseInt(
      process.env.POWER_USER_SCORE_THRESHOLD || "50",
      10
    );

    // Fetch last 30 days of DailyVisitorStats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

    const stats = await prisma.dailyVisitorStats.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
      },
      select: {
        visitorId: true,
        userId: true,
        taps: true,
        score: true,
        date: true,
      },
    });

    // Aggregate per visitorId
    const visitorMap = new Map<
      string,
      {
        visitorId: string;
        userId: string | null;
        totalScore: number;
        taps: number;
        activeDays: Set<string>;
      }
    >();

    for (const stat of stats) {
      const existing = visitorMap.get(stat.visitorId);
      const dateStr = stat.date.toISOString().slice(0, 10);

      if (existing) {
        existing.totalScore += stat.score;
        existing.taps += stat.taps;
        existing.activeDays.add(dateStr);
        // Keep the first non-null userId we encounter
        if (!existing.userId && stat.userId) {
          existing.userId = stat.userId;
        }
      } else {
        visitorMap.set(stat.visitorId, {
          visitorId: stat.visitorId,
          userId: stat.userId,
          totalScore: stat.score,
          taps: stat.taps,
          activeDays: new Set([dateStr]),
        });
      }
    }

    // Convert to array and sort by totalScore DESC
    const topVisitors = Array.from(visitorMap.values())
      .map((v) => ({
        visitorId: v.visitorId,
        userId: v.userId,
        totalScore: v.totalScore,
        taps: v.taps,
        activeDays: v.activeDays.size,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 20); // Top 20

    // Fetch user emails for the top 20 (only if userId exists)
    const userIds = topVisitors
      .map((v) => v.userId)
      .filter((id): id is string => id !== null);

    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u.email]));

    // Enrich top visitors with user emails
    const enriched = topVisitors.map((visitor) => ({
      ...visitor,
      userEmail: visitor.userId ? userMap.get(visitor.userId) || null : null,
    }));

    // Compute KPIs
    const powerUsersCount = Array.from(visitorMap.values()).filter(
      (v) => v.totalScore >= powerUserThreshold
    ).length;

    const top10Taps = topVisitors
      .slice(0, 10)
      .reduce((sum, v) => sum + v.taps, 0);
    const allTaps = Array.from(visitorMap.values()).reduce(
      (sum, v) => sum + v.taps,
      0
    );
    const powerUserShare = allTaps > 0 ? (top10Taps / allTaps) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        topVisitors: enriched,
        kpi: {
          powerUsersCount,
          powerUserShare: Math.round(powerUserShare * 10) / 10, // Round to 1 decimal
        },
      },
    });
  } catch (error) {
    console.error("[Power Users API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
