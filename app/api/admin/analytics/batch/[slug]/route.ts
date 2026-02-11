import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/analytics/batch/[slug]?days=30
 * Batch-specific analytics.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const daysParam = request.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam) : 30;

  try {
    const batch = await prisma.tagBatch.findUnique({
      where: { slug },
      include: {
        _count: { select: { tags: true, tapEvents: true } },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 }
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      tapsInPeriod,
      uniqueVisitorsAnon,
      uniqueVisitorsIp,
      topTags,
      deviceBreakdown,
      recentTaps,
    ] = await Promise.all([
      // Taps in period
      prisma.tapEvent.count({
        where: {
          batchId: batch.id,
          occurredAt: { gte: since },
        },
      }),

      // Unique visitors by anon ID
      prisma.tapEvent.groupBy({
        by: ["anonVisitorId"],
        where: {
          batchId: batch.id,
          occurredAt: { gte: since },
          anonVisitorId: { not: null },
        },
      }),

      // Unique visitors by IP
      prisma.tapEvent.groupBy({
        by: ["ipHash"],
        where: {
          batchId: batch.id,
          occurredAt: { gte: since },
          anonVisitorId: null,
          ipHash: { not: null },
        },
      }),

      // Top tags in this batch
      prisma.nfcTag.findMany({
        where: { batchId: batch.id },
        orderBy: { tapEvents: { _count: "desc" } },
        take: 10,
        include: {
          _count: { select: { tapEvents: true } },
        },
      }),

      // Device breakdown
      prisma.tapEvent.groupBy({
        by: ["deviceHint"],
        where: {
          batchId: batch.id,
          occurredAt: { gte: since },
        },
        _count: true,
      }),

      // Recent taps
      prisma.tapEvent.findMany({
        where: { batchId: batch.id },
        orderBy: { occurredAt: "desc" },
        take: 20,
        include: {
          tag: { select: { publicUuid: true, label: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          ...batch,
          tagCount: batch._count.tags,
          tapCount: batch._count.tapEvents,
        },
        period: { days, since },
        tapsInPeriod,
        uniqueVisitors: uniqueVisitorsAnon.length + uniqueVisitorsIp.length,
        topTags: topTags.map((t) => ({
          publicUuid: t.publicUuid,
          label: t.label,
          status: t.status,
          tapCount: t._count.tapEvents,
        })),
        deviceBreakdown: deviceBreakdown.map((d) => ({
          device: d.deviceHint || "unknown",
          count: d._count,
        })),
        recentTaps,
      },
    });
  } catch (error) {
    console.error("[Admin Analytics Batch] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
