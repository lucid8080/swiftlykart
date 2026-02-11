import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashIp, extractClientIp, upsertVisitor } from "@/lib/nfc";

/**
 * POST /api/tap/identify
 * Called from the client after localStorage anonVisitorId is available.
 * Associates recent TapEvents with the visitor and upserts Visitor record.
 *
 * Body: { anonVisitorId: string, srcBatch?: string, srcTag?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anonVisitorId, srcBatch, srcTag } = body;

    if (!anonVisitorId || typeof anonVisitorId !== "string") {
      return NextResponse.json(
        { success: false, error: "anonVisitorId is required" },
        { status: 400 }
      );
    }

    // Find the tag and batch for attribution
    let tagId: string | null = null;
    let batchId: string | null = null;

    if (srcBatch && srcTag) {
      const batch = await prisma.tagBatch.findUnique({
        where: { slug: srcBatch },
      });
      if (batch) {
        batchId = batch.id;
        const tag = await prisma.nfcTag.findUnique({
          where: { publicUuid: srcTag },
        });
        if (tag && tag.batchId === batch.id) {
          tagId = tag.id;
        }
      }
    }

    // Upsert the visitor record
    const visitor = await upsertVisitor(anonVisitorId, tagId, batchId);

    // Find recent unattributed TapEvents (within last 5 minutes)
    // that match by ipHash and don't have a visitorId yet
    const clientIp = extractClientIp(request);
    const ipHashed = clientIp ? hashIp(clientIp) : null;

    if (ipHashed) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

      await prisma.tapEvent.updateMany({
        where: {
          visitorId: null,
          ipHash: ipHashed,
          occurredAt: { gte: fiveMinAgo },
          ...(tagId ? { tagId } : {}),
        },
        data: {
          visitorId: visitor.id,
          anonVisitorId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        visitorId: visitor.id,
        tapCount: visitor.tapCount,
      },
    });
  } catch (error) {
    console.error("[Tap Identify] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
