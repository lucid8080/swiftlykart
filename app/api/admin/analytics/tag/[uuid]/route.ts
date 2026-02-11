import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/analytics/tag/[uuid]
 * Tag-specific analytics.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { uuid } = await params;

  try {
    const tag = await prisma.nfcTag.findUnique({
      where: { publicUuid: uuid },
      include: {
        batch: true,
        _count: { select: { tapEvents: true } },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    const [
      uniqueVisitorsAnon,
      uniqueVisitorsIp,
      deviceBreakdown,
      tapTimeline,
      recentVisitors,
    ] = await Promise.all([
      // Unique visitors by anon ID
      prisma.tapEvent.groupBy({
        by: ["anonVisitorId"],
        where: {
          tagId: tag.id,
          anonVisitorId: { not: null },
        },
      }),

      // Unique visitors by IP
      prisma.tapEvent.groupBy({
        by: ["ipHash"],
        where: {
          tagId: tag.id,
          anonVisitorId: null,
          ipHash: { not: null },
        },
      }),

      // Device breakdown
      prisma.tapEvent.groupBy({
        by: ["deviceHint"],
        where: { tagId: tag.id },
        _count: true,
      }),

      // Tap timeline (recent 50)
      prisma.tapEvent.findMany({
        where: { tagId: tag.id },
        orderBy: { occurredAt: "desc" },
        take: 50,
        select: {
          id: true,
          occurredAt: true,
          ipHash: true,
          userAgent: true,
          deviceHint: true,
          anonVisitorId: true,
          isDuplicate: true,
          country: true,
          region: true,
        },
      }),

      // Recent unique visitors for this tag
      prisma.tapEvent.findMany({
        where: {
          tagId: tag.id,
          visitorId: { not: null },
        },
        distinct: ["visitorId"],
        orderBy: { occurredAt: "desc" },
        take: 20,
        include: {
          visitor: {
            select: {
              id: true,
              anonVisitorId: true,
              tapCount: true,
              firstSeenAt: true,
              lastSeenAt: true,
            },
          },
        },
      }),
    ]);

    const domain =
      process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3001";

    return NextResponse.json({
      success: true,
      data: {
        tag: {
          ...tag,
          tapCount: tag._count.tapEvents,
          fullUrl: `https://${domain}/t/${tag.batch.slug}/${tag.publicUuid}`,
        },
        uniqueVisitors: uniqueVisitorsAnon.length + uniqueVisitorsIp.length,
        deviceBreakdown: deviceBreakdown.map((d) => ({
          device: d.deviceHint || "unknown",
          count: d._count,
        })),
        tapTimeline,
        recentVisitors: recentVisitors
          .map((te) => te.visitor)
          .filter(Boolean),
      },
    });
  } catch (error) {
    console.error("[Admin Analytics Tag] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
