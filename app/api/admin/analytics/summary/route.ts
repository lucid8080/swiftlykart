import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/analytics/summary
 * Dashboard summary: total taps, taps today/week, unique visitors, top batches/tags, power users, most purchased.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Run queries in parallel
    const [
      totalTaps,
      tapsToday,
      tapsThisWeek,
      tapsThisMonth,
      totalTags,
      totalBatches,
      uniqueVisitorsByAnon,
      uniqueVisitorsByIp,
      topBatches,
      topTags,
      powerUsers,
      mostPurchased,
    ] = await Promise.all([
      // Total taps all-time
      prisma.tapEvent.count(),

      // Taps today
      prisma.tapEvent.count({
        where: { occurredAt: { gte: todayStart } },
      }),

      // Taps this week
      prisma.tapEvent.count({
        where: { occurredAt: { gte: weekStart } },
      }),

      // Taps this month
      prisma.tapEvent.count({
        where: { occurredAt: { gte: monthStart } },
      }),

      // Total tags
      prisma.nfcTag.count(),

      // Total batches
      prisma.tagBatch.count(),

      // Unique visitors by anonVisitorId
      prisma.tapEvent.groupBy({
        by: ["anonVisitorId"],
        where: { anonVisitorId: { not: null } },
      }),

      // Unique visitors by ipHash (those without anonVisitorId)
      prisma.tapEvent.groupBy({
        by: ["ipHash"],
        where: {
          anonVisitorId: null,
          ipHash: { not: null },
        },
      }),

      // Top 5 batches by tap count
      prisma.tagBatch.findMany({
        take: 5,
        orderBy: {
          tapEvents: { _count: "desc" },
        },
        include: {
          _count: { select: { tapEvents: true, tags: true } },
        },
      }),

      // Top 5 tags by tap count
      prisma.nfcTag.findMany({
        take: 5,
        orderBy: {
          tapEvents: { _count: "desc" },
        },
        include: {
          batch: { select: { slug: true, name: true } },
          _count: { select: { tapEvents: true } },
        },
      }),

      // Power users (top 10 by tap count)
      prisma.visitor.findMany({
        take: 10,
        orderBy: { tapCount: "desc" },
        where: { tapCount: { gt: 0 } },
      }),

      // Most purchased items (top 10)
      prisma.myListItem.groupBy({
        by: ["itemKey", "itemLabel"],
        _sum: { timesPurchased: true },
        _count: true,
        orderBy: { _sum: { timesPurchased: "desc" } },
        take: 10,
        where: { timesPurchased: { gt: 0 } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalTaps,
        tapsToday,
        tapsThisWeek,
        tapsThisMonth,
        totalTags,
        totalBatches,
        uniqueVisitors: uniqueVisitorsByAnon.length + uniqueVisitorsByIp.length,
        topBatches: topBatches.map((b) => ({
          slug: b.slug,
          name: b.name,
          tapCount: b._count.tapEvents,
          tagCount: b._count.tags,
        })),
        topTags: topTags.map((t) => ({
          publicUuid: t.publicUuid,
          label: t.label,
          batchSlug: t.batch.slug,
          batchName: t.batch.name,
          tapCount: t._count.tapEvents,
        })),
        powerUsers: powerUsers.map((v) => ({
          id: v.id,
          anonVisitorId: v.anonVisitorId,
          tapCount: v.tapCount,
          firstSeenAt: v.firstSeenAt,
          lastSeenAt: v.lastSeenAt,
        })),
        mostPurchased: mostPurchased.map((item) => ({
          itemKey: item.itemKey,
          itemLabel: item.itemLabel,
          totalPurchases: item._sum.timesPurchased || 0,
          listCount: item._count,
        })),
      },
    });
  } catch (error) {
    console.error("[Admin Analytics Summary] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
