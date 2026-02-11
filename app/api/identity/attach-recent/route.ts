import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const attachRecentSchema = z.object({
  tapSessionId: z.string().min(1, "tapSessionId is required"),
  anonVisitorId: z.string().uuid("anonVisitorId must be a valid UUID").optional(),
});

/**
 * POST /api/identity/attach-recent
 * Optional short-lived association using tapSessionId TTL.
 * Only allows attaching within 10 minutes and only for the last N events to reduce abuse.
 *
 * This is a public endpoint (no auth required) but has strict TTL limits.
 *
 * Body: { tapSessionId: string, anonVisitorId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = attachRecentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { tapSessionId, anonVisitorId } = validation.data;

    // Only allow attaching within 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Find recent TapEvents that match tapSessionId (stored in sessionHint)
    // and occurred within the last 10 minutes
    const recentEvents = await prisma.tapEvent.findMany({
      where: {
        sessionHint: tapSessionId,
        occurredAt: { gte: tenMinutesAgo },
        visitorId: null, // Only unattributed events
      },
      orderBy: { occurredAt: "desc" },
      take: 10, // Limit to last 10 events
    });

    if (recentEvents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No recent tap events found for this session ID",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // If anonVisitorId is provided, upsert Visitor and link events
    if (anonVisitorId) {
      const visitor = await prisma.visitor.upsert({
        where: { anonVisitorId },
        create: {
          anonVisitorId,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          tapCount: recentEvents.length,
        },
        update: {
          lastSeenAt: new Date(),
          tapCount: { increment: recentEvents.length },
        },
      });

      // Link events to visitor
      await prisma.tapEvent.updateMany({
        where: {
          id: { in: recentEvents.map((e) => e.id) },
        },
        data: {
          visitorId: visitor.id,
          anonVisitorId,
          // If visitor is already claimed, also link to user
          ...(visitor.userId
            ? {
                userId: visitor.userId,
                linkedAt: new Date(),
                linkMethod: "recentTapSession",
              }
            : {}),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          visitorId: visitor.id,
          eventsLinked: recentEvents.length,
          userId: visitor.userId, // null if not claimed yet
        },
      });
    } else {
      // No anonVisitorId provided - just return count (can't link without visitor)
      return NextResponse.json({
        success: true,
        data: {
          eventsFound: recentEvents.length,
          message: "anonVisitorId required to link events",
        },
      });
    }
  } catch (error) {
    console.error("[Identity Attach Recent] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
