import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/batches/[slug]
 * Get batch details with tags and stats.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const batch = await prisma.tagBatch.findUnique({
      where: { slug },
      include: {
        tags: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { tapEvents: true } },
          },
        },
        _count: {
          select: { tapEvents: true },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 }
      );
    }

    // Get last tapped time per tag
    const tagsWithLastTap = await Promise.all(
      batch.tags.map(async (tag) => {
        const lastTap = await prisma.tapEvent.findFirst({
          where: { tagId: tag.id },
          orderBy: { occurredAt: "desc" },
          select: { occurredAt: true },
        });
        return {
          ...tag,
          tapCount: tag._count.tapEvents,
          lastTappedAt: lastTap?.occurredAt || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ...batch,
        tapCount: batch._count.tapEvents,
        tags: tagsWithLastTap,
      },
    });
  } catch (error) {
    console.error("[Admin Batch Detail GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/batches/[slug]
 * Update batch name/description.
 * Body: { name?, description? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const body = await request.json();
    const { name, description } = body;

    const batch = await prisma.tagBatch.findUnique({ where: { slug } });
    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.tagBatch.update({
      where: { slug },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Admin Batch PUT] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
