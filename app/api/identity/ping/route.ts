import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashIp, extractClientIp } from "@/lib/nfc";
import { z } from "zod";

const pingSchema = z.object({
  anonVisitorId: z.string().uuid("anonVisitorId must be a valid UUID"),
});

/**
 * POST /api/identity/ping
 * Called from client to ensure Visitor exists and update lastSeenAt/ipHashLastSeen/userAgentLastSeen.
 * This is a public endpoint (no auth required).
 *
 * Body: { anonVisitorId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = pingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    const { anonVisitorId } = validation.data;

    // Extract IP and user agent
    const clientIp = extractClientIp(request);
    const ipHashed = clientIp ? hashIp(clientIp) : null;
    const userAgent = request.headers.get("user-agent") || null;

    // Upsert Visitor record
    const visitor = await prisma.visitor.upsert({
      where: { anonVisitorId },
      create: {
        anonVisitorId,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        ipHashLastSeen: ipHashed,
        userAgentLastSeen: userAgent,
        tapCount: 0,
      },
      update: {
        lastSeenAt: new Date(),
        ...(ipHashed ? { ipHashLastSeen: ipHashed } : {}),
        ...(userAgent ? { userAgentLastSeen: userAgent } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        visitorId: visitor.id,
        userId: visitor.userId, // null if not claimed yet
      },
    });
  } catch (error) {
    console.error("[Identity Ping] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
