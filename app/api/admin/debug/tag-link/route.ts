import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * Debug endpoint to check if taps for a tag are linked to a user
 * GET /api/admin/debug/tag-link?tagUuid=...&userEmail=...
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const tagUuid = request.nextUrl.searchParams.get("tagUuid");
  const userEmail = request.nextUrl.searchParams.get("userEmail");

  if (!tagUuid || !userEmail) {
    return NextResponse.json(
      { success: false, error: "tagUuid and userEmail are required" },
      { status: 400 }
    );
  }

  try {
    // Find the tag
    const tag = await prisma.nfcTag.findUnique({
      where: { publicUuid: tagUuid },
    });

    if (!tag) {
      return NextResponse.json({ success: false, error: "Tag not found" }, { status: 404 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Get all taps for this tag
    const allTaps = await prisma.tapEvent.findMany({
      where: { tagId: tag.id },
      select: {
        id: true,
        occurredAt: true,
        userId: true,
        anonVisitorId: true,
        visitorId: true,
        linkedAt: true,
        linkMethod: true,
      },
      orderBy: { occurredAt: "desc" },
    });

    // Get taps linked to this user
    const linkedTaps = allTaps.filter(t => t.userId === user.id);

    // Get visitor for this user
    const visitor = await prisma.visitor.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        anonVisitorId: true,
        userId: true,
      },
    });

    // Get taps with matching anonVisitorId (if visitor exists)
    const tapsByAnonId = visitor
      ? allTaps.filter(t => t.anonVisitorId === visitor.anonVisitorId)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        tag: {
          id: tag.id,
          publicUuid: tag.publicUuid,
          label: tag.label,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        visitor: visitor
          ? {
              id: visitor.id,
              anonVisitorId: visitor.anonVisitorId,
              userId: visitor.userId,
            }
          : null,
        stats: {
          totalTaps: allTaps.length,
          linkedTaps: linkedTaps.length,
          tapsWithUserId: allTaps.filter(t => t.userId !== null).length,
          tapsWithAnonId: tapsByAnonId.length,
        },
        allTaps: allTaps.map(t => ({
          id: t.id,
          occurredAt: t.occurredAt,
          userId: t.userId,
          anonVisitorId: t.anonVisitorId,
          visitorId: t.visitorId,
          linkedAt: t.linkedAt,
          linkMethod: t.linkMethod,
          isLinkedToUser: t.userId === user.id,
        })),
      },
    });
  } catch (error) {
    console.error("[Debug Tag Link] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
