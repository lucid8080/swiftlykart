import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { generateTagsCsv } from "@/lib/csv";

/**
 * GET /api/admin/tags/export?batchSlug=...
 * Export tags for a batch as CSV download.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const batchSlug = request.nextUrl.searchParams.get("batchSlug");

  if (!batchSlug) {
    return NextResponse.json(
      { success: false, error: "batchSlug query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const batch = await prisma.tagBatch.findUnique({
      where: { slug: batchSlug },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 }
      );
    }

    const tags = await prisma.nfcTag.findMany({
      where: { batchId: batch.id },
      orderBy: { createdAt: "asc" },
      include: { batch: { select: { slug: true } } },
    });

    const domain =
      process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3001";

    const csv = generateTagsCsv(tags, domain);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tags-${batchSlug}.csv"`,
      },
    });
  } catch (error) {
    console.error("[Admin Tags Export] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
