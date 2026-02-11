import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const claimSchema = z.object({
  anonVisitorId: z.string().uuid("anonVisitorId must be a valid UUID"),
  method: z.enum(["login", "signup", "manual"]).default("manual"),
});

/**
 * POST /api/identity/claim
 * Retroactively link all past TapEvents and MyList data to the authenticated user.
 * Requires authentication. Fully transactional and idempotent.
 *
 * Body: { anonVisitorId: string, method: "login"|"signup"|"manual" }
 *
 * Flow (inside $transaction):
 * 1. Require authenticated user session
 * 2. Upsert Visitor by anonVisitorId
 * 3. Safety check: If Visitor already linked to DIFFERENT userId → 409
 * 4. Set Visitor.userId = current user id (if not already set)
 * 5. UpdateMany TapEvents (anonVisitorId match + fallbacks) → set userId, linkedAt, linkMethod
 * 6. Retroactively link MyList
 * 7. Upsert IdentityClaim audit row (idempotent on userId+visitorId)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Require authenticated user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Validate request body
    const body = await request.json();
    const validation = claimSchema.safeParse(body);

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

    const { anonVisitorId, method } = validation.data;

    // Run everything in a transaction for atomicity and idempotency
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 3. Upsert Visitor by anonVisitorId
      let visitor = await tx.visitor.upsert({
      where: { anonVisitorId },
        create: {
          anonVisitorId,
          firstSeenAt: now,
          lastSeenAt: now,
          tapCount: 0,
        },
        update: {
          lastSeenAt: now,
        },
      });

    // 4. Safety check: If Visitor already linked to DIFFERENT userId, block
    if (visitor.userId && visitor.userId !== userId) {
        return { conflict: true } as const;
    }

    // 5. Set Visitor.userId = current user id (if not already set)
    if (!visitor.userId) {
        visitor = await tx.visitor.update({
        where: { id: visitor.id },
        data: { userId },
      });
    }

      // 6. Retroactively link TapEvents — primary: by anonVisitorId or visitorId
      const tapEventsUpdated = await tx.tapEvent.updateMany({
      where: {
        OR: [
          { anonVisitorId },
          { visitorId: visitor.id },
        ],
        userId: null,
      },
      data: {
        userId,
          visitorId: visitor.id,
          anonVisitorId,
        linkedAt: now,
          linkMethod: method,
      },
    });

      console.log(`[Identity Claim] Primary: linked ${tapEventsUpdated.count} taps for anonVisitorId=${anonVisitorId}, method=${method}`);
    
      // Ensure any taps with this anonVisitorId that lack visitorId get it
      await tx.tapEvent.updateMany({
        where: { anonVisitorId, visitorId: null },
        data: { visitorId: visitor.id },
    });

    // FALLBACK 1: Link taps by MyList sourceTagId/sourceBatchId
      const myListForLinking = await tx.myList.findFirst({
      where: { ownerVisitorId: visitor.id },
      include: {
        items: {
          select: { sourceTagId: true, sourceBatchId: true },
          take: 20,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const tagIdsToLink = new Set<string>();
    const batchIdsToLink = new Set<string>();
    
    if (myListForLinking) {
        if (myListForLinking.sourceTagId) tagIdsToLink.add(myListForLinking.sourceTagId);
        if (myListForLinking.sourceBatchId) batchIdsToLink.add(myListForLinking.sourceBatchId);
      for (const item of myListForLinking.items) {
          if (item.sourceTagId) tagIdsToLink.add(item.sourceTagId);
        if (item.sourceBatchId) batchIdsToLink.add(item.sourceBatchId);
      }
      }

    if (tagIdsToLink.size > 0 || batchIdsToLink.size > 0) {
        const unlinkedTagTaps = await tx.tapEvent.findMany({
        where: {
          OR: [
            ...(tagIdsToLink.size > 0 ? [{ tagId: { in: Array.from(tagIdsToLink) } }] : []),
            ...(batchIdsToLink.size > 0 ? [{ batchId: { in: Array.from(batchIdsToLink) } }] : []),
          ],
            userId: null,
          },
          select: { id: true },
        take: 200,
        });

        if (unlinkedTagTaps.length > 0) {
          await tx.tapEvent.updateMany({
          where: {
              id: { in: unlinkedTagTaps.map((t) => t.id) },
            userId: null,
          },
          data: {
            userId,
            visitorId: visitor.id,
              anonVisitorId,
            linkedAt: now,
            linkMethod: "myListSourceTag",
          },
        });
          console.log(`[Identity Claim] Fallback 1: linked ${unlinkedTagTaps.length} taps via MyList sourceTag`);
      }
    }

    // FALLBACK 2: Link taps by Visitor's lastTagId/lastBatchId
    if (visitor.lastTagId || visitor.lastBatchId) {
        const visitorTagTaps = await tx.tapEvent.findMany({
        where: {
          OR: [
            ...(visitor.lastTagId ? [{ tagId: visitor.lastTagId }] : []),
            ...(visitor.lastBatchId ? [{ batchId: visitor.lastBatchId }] : []),
          ],
          userId: null,
        },
        select: { id: true },
        take: 50,
      });

      if (visitorTagTaps.length > 0) {
          await tx.tapEvent.updateMany({
          where: {
              id: { in: visitorTagTaps.map((t) => t.id) },
            userId: null,
          },
          data: {
            userId,
            visitorId: visitor.id,
            anonVisitorId,
            linkedAt: now,
            linkMethod: "visitorLastTag",
          },
        });
          console.log(`[Identity Claim] Fallback 2: linked ${visitorTagTaps.length} taps via lastTagId/lastBatchId`);
      }
    }

      // FALLBACK 3: Link taps by Visitor's stored IP+userAgent (within 7 days)
    if (visitor.ipHashLastSeen && visitor.userAgentLastSeen) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
        const visitorIpTaps = await tx.tapEvent.findMany({
        where: {
          ipHash: visitor.ipHashLastSeen,
          userAgent: visitor.userAgentLastSeen,
          userId: null,
            occurredAt: { gte: sevenDaysAgo },
        },
        select: { id: true },
        take: 100,
      });

      if (visitorIpTaps.length > 0) {
          await tx.tapEvent.updateMany({
          where: {
              id: { in: visitorIpTaps.map((t) => t.id) },
            userId: null,
          },
          data: {
            userId,
            visitorId: visitor.id,
            anonVisitorId,
            linkedAt: now,
            linkMethod: "visitorStoredIpUa",
          },
        });
          console.log(`[Identity Claim] Fallback 3: linked ${visitorIpTaps.length} taps via IP+UA`);
      }
    }

    // 7. Retroactively link MyList
      let myListClaimed = false;
      const myList = await tx.myList.findFirst({
      where: { ownerVisitorId: visitor.id },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          select: {
            id: true,
              itemKey: true,
              itemLabel: true,
              quantity: true,
              timesPurchased: true,
              lastAddedAt: true,
              purchasedAt: true,
            sourceTagId: true,
            sourceBatchId: true,
          },
        },
      },
    });

    if (myList) {
      // Check if user already has a MyList
        const existingUserList = await tx.myList.findFirst({
        where: { ownerUserId: userId },
        include: { items: true },
      });

      if (existingUserList) {
        // Merge: move items from visitor list to user list (dedupe by itemKey)
        for (const item of myList.items) {
          const existingItem = existingUserList.items.find(
            (i) => i.itemKey === item.itemKey
          );

          if (existingItem) {
              await tx.myListItem.update({
              where: { id: existingItem.id },
              data: {
                  quantity: Math.max(existingItem.quantity || 0, item.quantity || 0),
                  timesPurchased: Math.max(existingItem.timesPurchased, item.timesPurchased),
                lastAddedAt: new Date(
                    Math.max(existingItem.lastAddedAt.getTime(), item.lastAddedAt.getTime())
                ),
              },
            });
          } else {
              await tx.myListItem.create({
              data: {
                listId: existingUserList.id,
                itemKey: item.itemKey,
                itemLabel: item.itemLabel,
                quantity: item.quantity,
                timesPurchased: item.timesPurchased,
                lastAddedAt: item.lastAddedAt,
                purchasedAt: item.purchasedAt,
                sourceBatchId: item.sourceBatchId,
                sourceTagId: item.sourceTagId,
              },
            });
            }
          }
        }

        // Mark visitor list as claimed
        await tx.myList.update({
          where: { id: myList.id },
          data: {
            ownerUserId: userId,
            claimedAt: now,
          },
        });
        myListClaimed = true;
    }

      // 8. Upsert IdentityClaim audit row (idempotent on userId+visitorId)
      await tx.identityClaim.upsert({
        where: {
          userId_visitorId: { userId, visitorId: visitor.id },
        },
        create: {
        userId,
        visitorId: visitor.id,
        claimedAt: now,
          method,
        details: {
          anonVisitorId,
          tapEventsLinked: tapEventsUpdated.count,
            myListClaimed,
          },
        },
        update: {
          claimedAt: now,
          method,
          details: {
            anonVisitorId,
            tapEventsLinked: tapEventsUpdated.count,
            myListClaimed,
            reclaimedAt: now.toISOString(),
        },
      },
    });

      // Count total linked taps in this session
      const sessionStart = new Date(now.getTime() - 2000);
      const totalLinked = await tx.tapEvent.count({
      where: {
        userId,
        linkedAt: { gte: sessionStart },
      },
    });

      console.log(`[Identity Claim] Total taps linked: ${totalLinked}, method=${method}`);

      return {
        conflict: false as const,
        visitorId: visitor.id,
        tapEventsLinked: totalLinked,
        myListClaimed,
        anonVisitorId,
      };
    }, {
      timeout: 15000, // 15s timeout for the transaction
    });

    // Handle conflict (returned from inside transaction)
    if (result.conflict) {
      return NextResponse.json(
        {
          success: false,
          error: "This device's NFC history is linked to another account",
          code: "ALREADY_CLAIMED",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        visitorId: result.visitorId,
        tapEventsLinked: result.tapEventsLinked,
        myListClaimed: result.myListClaimed,
        anonVisitorId: result.anonVisitorId,
      },
    });
  } catch (error) {
    console.error("[Identity Claim] Error:", error);
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
