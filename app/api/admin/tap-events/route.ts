import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/tap-events?batchSlug=...&tagUuid=...&from=...&to=...&visitor=...&page=1&limit=50
 * Searchable tap events with filters and pagination.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const batchSlug = request.nextUrl.searchParams.get("batchSlug");
  const tagUuid = request.nextUrl.searchParams.get("tagUuid");
  const fromDate = request.nextUrl.searchParams.get("from");
  const toDate = request.nextUrl.searchParams.get("to");
  const visitor = request.nextUrl.searchParams.get("visitor");
  const userIdFilter = request.nextUrl.searchParams.get("userId");
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "50"),
    200
  );
  const skip = (page - 1) * limit;

  try {
    // Build where clause
    const where: Record<string, unknown> = {};

    if (batchSlug) {
      const batch = await prisma.tagBatch.findUnique({
        where: { slug: batchSlug },
      });
      if (batch) {
        where.batchId = batch.id;
      }
    }

    if (tagUuid) {
      const tag = await prisma.nfcTag.findUnique({
        where: { publicUuid: tagUuid },
      });
      if (tag) {
        where.tagId = tag.id;
      }
    }

    if (fromDate || toDate) {
      const dateFilter: Record<string, Date> = {};
      if (fromDate) dateFilter.gte = new Date(fromDate);
      if (toDate) dateFilter.lte = new Date(toDate);
      where.occurredAt = dateFilter;
    }

    if (visitor) {
      where.anonVisitorId = visitor;
    }

    if (userIdFilter) {
      where.userId = userIdFilter;
    }

    const [events, total] = await Promise.all([
      prisma.tapEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: "desc" },
        select: {
          id: true,
          tagId: true,
          batchId: true,
          occurredAt: true,
          ipHash: true,
          userAgent: true,
          deviceHint: true,
          anonVisitorId: true,
          isDuplicate: true,
          duplicateOfId: true,
          visitorId: true,
          // Retroactive attribution fields
          userId: true,
          linkedAt: true,
          linkMethod: true,
          tapperHadSession: true,
          createdAt: true,
          batch: { select: { slug: true, name: true } },
          tag: { select: { publicUuid: true, label: true } },
          visitor: {
            select: {
              id: true,
              anonVisitorId: true,
              tapCount: true,
              userId: true,
            },
          },
        },
      }),
      prisma.tapEvent.count({ where }),
    ]);

    // Fetch user emails for events with userId
    const userIds = [...new Set(events.map((e) => e.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Enrich events with user info
    const enrichedEvents = events.map((event) => ({
      ...event,
      user: event.userId ? userMap.get(event.userId) : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        events: enrichedEvents,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Admin Tap Events GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
