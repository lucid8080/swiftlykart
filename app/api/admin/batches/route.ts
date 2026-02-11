import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/batches
 * List all tag batches with tap counts.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const batches = await prisma.tagBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            tags: true,
            tapEvents: true,
          },
        },
      },
    });

    // Get unique visitor counts per batch
    const batchesWithStats = await Promise.all(
      batches.map(async (batch) => {
        const uniqueVisitors = await prisma.tapEvent.groupBy({
          by: ["anonVisitorId"],
          where: {
            batchId: batch.id,
            anonVisitorId: { not: null },
          },
        });

        // Also count unique by ipHash for visitors without anonVisitorId
        const uniqueIps = await prisma.tapEvent.groupBy({
          by: ["ipHash"],
          where: {
            batchId: batch.id,
            anonVisitorId: null,
            ipHash: { not: null },
          },
        });

        return {
          ...batch,
          tagCount: batch._count.tags,
          tapCount: batch._count.tapEvents,
          uniqueVisitors: uniqueVisitors.length + uniqueIps.length,
        };
      })
    );

    return NextResponse.json({ success: true, data: batchesWithStats });
  } catch (error) {
    console.error("[Admin Batches GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/batches
 * Create a new tag batch.
 * Body: { slug, name, description? }
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slug, name, description } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { success: false, error: "slug and name are required" },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, hyphens, no spaces)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        {
          success: false,
          error: "Slug must be lowercase letters, numbers, and hyphens only",
        },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await prisma.tagBatch.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A batch with this slug already exists" },
        { status: 409 }
      );
    }

    const batch = await prisma.tagBatch.create({
      data: { slug, name, description: description || null },
    });

    return NextResponse.json({ success: true, data: batch }, { status: 201 });
  } catch (error) {
    console.error("[Admin Batches POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
