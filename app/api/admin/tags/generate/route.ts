import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/admin/tags/generate
 * Bulk generate NFC tags for a batch.
 * Body: { batchSlug: string, count: number, labelPrefix?: string }
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { batchSlug, count, labelPrefix } = body;

    if (!batchSlug || !count || count < 1) {
      return NextResponse.json(
        { success: false, error: "batchSlug and count (>0) are required" },
        { status: 400 }
      );
    }

    if (count > 10000) {
      return NextResponse.json(
        { success: false, error: "Maximum 10,000 tags per generation" },
        { status: 400 }
      );
    }

    // Find the batch
    const batch = await prisma.tagBatch.findUnique({
      where: { slug: batchSlug },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 }
      );
    }

    // Get existing tag count for label numbering
    const existingCount = await prisma.nfcTag.count({
      where: { batchId: batch.id },
    });

    // Generate tags
    const tags = [];
    for (let i = 0; i < count; i++) {
      const num = existingCount + i + 1;
      const paddedNum = String(num).padStart(3, "0");
      const label = labelPrefix
        ? `${labelPrefix} ${paddedNum}`
        : `${batch.slug}-${paddedNum}`;

      tags.push({
        publicUuid: uuidv4(),
        batchId: batch.id,
        label,
        status: "active",
      });
    }

    // Batch insert
    await prisma.nfcTag.createMany({ data: tags });

    // Fetch created tags to return with full data
    const createdTags = await prisma.nfcTag.findMany({
      where: {
        batchId: batch.id,
        publicUuid: { in: tags.map((t) => t.publicUuid) },
      },
      orderBy: { createdAt: "desc" },
      include: { batch: { select: { slug: true } } },
    });

    const domain =
      process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3001";

    const tagsWithUrls = createdTags.map((tag) => ({
      ...tag,
      fullUrl: `https://${domain}/t/${batch.slug}/${tag.publicUuid}`,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          batch,
          count: tagsWithUrls.length,
          tags: tagsWithUrls,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Admin Tags Generate] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
