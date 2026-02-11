import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { generateUUID } from "@/lib/utils";

/**
 * POST /api/admin/manual-link-taps
 * Manually link taps for a tag to a user (admin only)
 * Body: { tagUuid: string, userEmail: string }
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tagUuid, userEmail } = body;

    if (!tagUuid || !userEmail) {
      return NextResponse.json(
        { success: false, error: "tagUuid and userEmail are required" },
        { status: 400 }
      );
    }

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

    // Find or create visitor for this user
    let visitor = await prisma.visitor.findFirst({
      where: { userId: user.id },
    });

    if (!visitor) {
      // Create a visitor with a new anonVisitorId
      const anonVisitorId = generateUUID();
      visitor = await prisma.visitor.create({
        data: {
          anonVisitorId,
          userId: user.id,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          tapCount: 0,
        },
      });
    }

    // Find all unlinked taps for this tag
    const unlinkedTaps = await prisma.tapEvent.findMany({
      where: {
        tagId: tag.id,
        userId: null,
      },
      select: { id: true },
    });

    if (unlinkedTaps.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: "No unlinked taps found for this tag",
          tagUuid,
          userEmail,
        },
      });
    }

    // Link all taps to the user
    const now = new Date();
    const linkedCount = await prisma.tapEvent.updateMany({
      where: {
        id: { in: unlinkedTaps.map(t => t.id) },
        userId: null,
      },
      data: {
        userId: user.id,
        visitorId: visitor.id,
        anonVisitorId: visitor.anonVisitorId,
        linkedAt: now,
        linkMethod: "manualAdminLink",
      },
    });

    // Update visitor tap count
    await prisma.visitor.update({
      where: { id: visitor.id },
      data: {
        tapCount: { increment: linkedCount.count },
        lastTagId: tag.id,
        lastBatchId: tag.batchId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully linked ${linkedCount.count} taps`,
        tagUuid,
        tagLabel: tag.label,
        userEmail,
        tapsLinked: linkedCount.count,
      },
    });
  } catch (error) {
    console.error("[Manual Link Taps] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
