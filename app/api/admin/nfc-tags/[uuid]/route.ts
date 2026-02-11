import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/nfc-tags/[uuid]
 * Get tag details with tap timeline and visitor list.
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
        linkedUser: { select: { id: true, email: true, name: true } },
        tapEvents: {
          orderBy: { occurredAt: "desc" },
          take: 100,
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
        },
        _count: { select: { tapEvents: true } },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    const domain =
      process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3001";

    return NextResponse.json({
      success: true,
      data: {
        ...tag,
        tapCount: tag._count.tapEvents,
        fullUrl: `https://${domain}/t/${tag.batch.slug}/${tag.publicUuid}`,
      },
    });
  } catch (error) {
    console.error("[Admin Tag Detail GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/nfc-tags/[uuid]
 * Update tag status (enable/disable), label, or linked user.
 * Body: { status?: "active" | "disabled", label?: string, linkedUserEmail?: string | null }
 *
 * linkedUserEmail: set to an email to link, set to null or "" to unlink.
 * Once linked, ALL taps on this tag are attributed to the linked user.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { uuid } = await params;

  try {
    const body = await request.json();
    const { status, label, linkedUserEmail } = body;

    const tag = await prisma.nfcTag.findUnique({
      where: { publicUuid: uuid },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (label !== undefined) updateData.label = label;

    // Handle linking/unlinking user by email
    if (linkedUserEmail !== undefined) {
      if (linkedUserEmail === null || linkedUserEmail === "") {
        // Unlink user from tag
        updateData.linkedUserId = null;
        console.log(`[Admin Tag PUT] Unlinking user from tag ${uuid}`);
      } else {
        // Find user by email and link
        const user = await prisma.user.findUnique({
          where: { email: linkedUserEmail },
        });
        if (!user) {
          return NextResponse.json(
            { success: false, error: `User not found: ${linkedUserEmail}` },
            { status: 404 }
          );
        }
        updateData.linkedUserId = user.id;
        console.log(`[Admin Tag PUT] Linking tag ${uuid} to user ${user.email} (${user.id})`);
      }
    }

    const updated = await prisma.nfcTag.update({
      where: { publicUuid: uuid },
      data: updateData,
      include: {
        linkedUser: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Admin Tag PUT] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
