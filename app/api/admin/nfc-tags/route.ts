import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/nfc-tags?batchSlug=...&status=...&page=1&limit=50
 * List NFC tags with filters and pagination.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const batchSlug = request.nextUrl.searchParams.get("batchSlug");
  const status = request.nextUrl.searchParams.get("status");
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 200);
  const skip = (page - 1) * limit;

  try {
    // Build where clause
    const where: Record<string, unknown> = {};

    if (batchSlug) {
      const batch = await prisma.tagBatch.findUnique({ where: { slug: batchSlug } });
      if (batch) {
        where.batchId = batch.id;
      } else {
        return NextResponse.json({ success: true, data: { tags: [], total: 0 } });
      }
    }

    if (status) {
      where.status = status;
    }

    const [tags, total] = await Promise.all([
      prisma.nfcTag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          batch: { select: { slug: true, name: true } },
          linkedUser: { select: { id: true, email: true, name: true } },
          _count: { select: { tapEvents: true } },
        },
      }),
      prisma.nfcTag.count({ where }),
    ]);

    // Get last tapped time and user info per tag
    // First, get all tag IDs
    const tagIds = tags.map(t => t.id);
    
    // Get all tap events for these tags with userId
    const allUserTaps = await prisma.tapEvent.findMany({
      where: {
        tagId: { in: tagIds },
        userId: { not: null },
      },
      select: {
        tagId: true,
        userId: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: "desc" },
    });

    console.log(`[Admin NFC Tags] Found ${allUserTaps.length} taps with userId for ${tagIds.length} tags`);

    // Get unique userIds and fetch user details
    const allUserIds = [...new Set(allUserTaps.map(t => t.userId).filter(Boolean))] as string[];
    console.log(`[Admin NFC Tags] Unique userIds: ${allUserIds.length}`, allUserIds.slice(0, 5));
    
    const allUsers = allUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    console.log(`[Admin NFC Tags] Found ${allUsers.length} users:`, allUsers.map(u => u.email || u.id.slice(0, 8)));
    
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // Group taps by tagId
    const tapsByTag = new Map<string, typeof allUserTaps>();
    for (const tap of allUserTaps) {
      if (!tapsByTag.has(tap.tagId)) {
        tapsByTag.set(tap.tagId, []);
      }
      tapsByTag.get(tap.tagId)!.push(tap);
    }

    // Get last tapped time per tag
    const tagsWithStats = await Promise.all(
      tags.map(async (tag) => {
        const lastTap = await prisma.tapEvent.findFirst({
          where: { tagId: tag.id },
          orderBy: { occurredAt: "desc" },
          select: { 
            occurredAt: true,
            userId: true,
          },
        });

        // Get unique users for this tag
        const tagTaps = tapsByTag.get(tag.id) || [];
        const tagUserIds = [...new Set(tagTaps.map(t => t.userId).filter(Boolean))] as string[];
        const tagUsers = tagUserIds.map(id => userMap.get(id)).filter(Boolean) as typeof allUsers;
        
        // Debug logging for specific tag
        if (tag.publicUuid === "94a16b33-1a0d-48c0-adba-36acf75979a4") {
          console.log(`[Admin NFC Tags] Tag pro-001 (${tag.id}):`);
          console.log(`  - tagTaps: ${tagTaps.length}`);
          console.log(`  - tagUserIds: ${tagUserIds.join(', ')}`);
          console.log(`  - tagUsers: ${tagUsers.map(u => u.email || u.id).join(', ')}`);
          console.log(`  - lastTap userId: ${lastTap?.userId}`);
          console.log(`  - userMap has userId: ${lastTap?.userId ? userMap.has(lastTap.userId) : false}`);
        }
        
        // Get most recent user
        const mostRecentUser = lastTap?.userId && userMap.has(lastTap.userId)
          ? userMap.get(lastTap.userId)!
          : null;

        return {
          ...tag,
          tapCount: tag._count.tapEvents,
          lastTappedAt: lastTap?.occurredAt || null,
          uniqueUsersCount: tagUsers.length,
          users: tagUsers,
          mostRecentUser: mostRecentUser,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        tags: tagsWithStats,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Admin NFC Tags GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
