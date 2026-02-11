import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  hashIp,
  deriveDeviceHint,
  findDuplicateTap,
  extractClientIp,
  upsertVisitor,
} from "@/lib/nfc";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchSlug: string; tagUuid: string }> }
) {
  const { batchSlug, tagUuid } = await params;

  const userAgent = request.headers.get("user-agent") || "unknown";
  const deviceHint = userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone") ? "mobile" : "desktop";
  
  console.log(`[NFC Tap] ${deviceHint.toUpperCase()} request: batch=${batchSlug}, tag=${tagUuid}, url=${request.url}`);
  console.log(`[NFC Tap] User-Agent: ${userAgent.substring(0, 100)}`);

  // Get host and protocol once for all redirects
  const host = request.headers.get("host") || "localhost:3001";
  const protocol = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
  const baseUrl = `${protocol}://${host}`;

  try {
    // 1. Look up batch + tag
    const batch = await prisma.tagBatch.findUnique({
      where: { slug: batchSlug },
    });

    if (!batch) {
      console.error(`[NFC Tap] ${deviceHint.toUpperCase()} - Batch not found: ${batchSlug}`);
      return NextResponse.redirect(new URL(`${baseUrl}/?error=batch-not-found`));
    }

    console.log(`[NFC Tap] ${deviceHint.toUpperCase()} - Found batch: id=${batch.id}, name=${batch.name}`);

    const tag = await prisma.nfcTag.findUnique({
      where: { publicUuid: tagUuid },
    });

    if (!tag) {
      console.error(`[NFC Tap] ${deviceHint.toUpperCase()} - Tag not found: ${tagUuid}`);
      return NextResponse.redirect(new URL(`${baseUrl}/?error=tag-not-found`));
    }

    if (tag.batchId !== batch.id) {
      console.error(`[NFC Tap] ${deviceHint.toUpperCase()} - Tag ${tagUuid} does not belong to batch ${batchSlug}. Tag batchId=${tag.batchId}, expected=${batch.id}`);
      return NextResponse.redirect(new URL(`${baseUrl}/?error=tag-not-found`));
    }

    if (tag.status !== "active") {
      console.warn(`[NFC Tap] ${deviceHint.toUpperCase()} - Tag ${tagUuid} is not active (status=${tag.status})`);
      return NextResponse.redirect(new URL(`${baseUrl}/?error=tag-disabled`));
    }

    console.log(`[NFC Tap] ${deviceHint.toUpperCase()} - Found tag: id=${tag.id}, label=${tag.label || 'none'}, status=${tag.status}`);

    // 2. Extract request info
    const clientIp = extractClientIp(request);
    const ipHashed = clientIp ? hashIp(clientIp) : null;
    const requestUserAgent = request.headers.get("user-agent") || null;
    const acceptLanguage = request.headers.get("accept-language") || null;
    const referer = request.headers.get("referer") || null;
    const derivedDeviceHint = deriveDeviceHint(requestUserAgent);

    // Check for anonVisitorId from header (preferred) or query param (fallback)
    const anonVisitorId =
      request.headers.get("x-anon-visitor-id") ||
      request.nextUrl.searchParams.get("vid") ||
      null;

    // 3. Dedup check: same tag + same visitor within 2 minutes
    const duplicateOfId = await findDuplicateTap(
      tag.id,
      anonVisitorId,
      ipHashed,
      requestUserAgent,
      2
    );

    // 4. Create TapEvent
    const tapEvent = await prisma.tapEvent.create({
      data: {
        tagId: tag.id,
        batchId: batch.id,
        occurredAt: new Date(),
        ipHash: ipHashed,
        userAgent: requestUserAgent,
        acceptLanguage,
        referer,
        deviceHint: derivedDeviceHint,
        anonVisitorId,
        isDuplicate: !!duplicateOfId,
        duplicateOfId: duplicateOfId || null,
      },
    });

    console.log(`[NFC Tap] ${deviceHint.toUpperCase()} tap event CREATED: id=${tapEvent.id}, isDuplicate=${tapEvent.isDuplicate}, ipHash=${ipHashed ? 'present' : 'null'}, anonVisitorId=${anonVisitorId || 'null'}`);

    // 5. Check for authenticated session to link tap to user
    let sessionUserId: string | null = null;
    try {
      const session = await auth();
      if (session?.user?.id) {
        sessionUserId = session.user.id;
      }
    } catch (sessionError) {
      console.warn(`[NFC Tap] ${deviceHint.toUpperCase()} - Session read failed:`, sessionError);
      // Continue without session — don't break the flow
    }

    // 6. Upsert Visitor if anonVisitorId is present
    let visitorId: string | null = null;
    let visitorUserId: string | null = null;
    if (anonVisitorId) {
      const visitor = await upsertVisitor(anonVisitorId, tag.id, batch.id);
      visitorId = visitor.id;
      visitorUserId = visitor.userId; // If visitor is already claimed, get userId
    }

    // 7. Link tap event to user
    // Priority: tag.linkedUserId > sessionUserId > visitorUserId
    // If tag is linked to a user, ALL taps on that tag are attributed to that user
    const tagLinkedUserId = tag.linkedUserId;
    const userIdToLink = tagLinkedUserId || sessionUserId || visitorUserId;
    let linkMethod: string | null = null;

    if (tagLinkedUserId) {
      linkMethod = "tag_linked";
    } else if (sessionUserId) {
      linkMethod = "session";
    } else if (visitorUserId) {
      linkMethod = "anonVisitorId";
    }

    if (userIdToLink || visitorId) {
      await prisma.tapEvent.update({
        where: { id: tapEvent.id },
        data: {
          ...(visitorId ? { visitorId: visitorId } : {}),
          ...(userIdToLink
            ? {
                userId: userIdToLink,
                linkedAt: new Date(),
                linkMethod: linkMethod || null,
              }
            : {}),
          tapperHadSession: !!sessionUserId, // Track if tapper was signed in
        },
      });

      console.log(`[NFC Tap] ${deviceHint.toUpperCase()} - TapEvent linked: userId=${userIdToLink || 'null'}, visitorId=${visitorId || 'null'}, linkMethod=${linkMethod || 'none'}, tagLinked=${tagLinkedUserId ? 'yes' : 'no'}`);

      // If we have sessionUserId and visitor exists, ensure visitor is linked to user
      // Don't overwrite if the tag is linked (tag owner != tapper)
      if (sessionUserId && visitorId && !visitorUserId && !tagLinkedUserId) {
        await prisma.visitor.update({
          where: { id: visitorId },
          data: { userId: sessionUserId },
        });
        console.log(`[NFC Tap] ${deviceHint.toUpperCase()} - Visitor ${visitorId} linked to user ${sessionUserId}`);
      }
    } else {
      // Still track if tapper had a session, even if not linked to user
      await prisma.tapEvent.update({
        where: { id: tapEvent.id },
        data: { tapperHadSession: !!sessionUserId },
      });
      console.log(`[NFC Tap] ${deviceHint.toUpperCase()} - TapEvent NOT linked to user: no tag link, no session, no visitor userId`);
    }

    // 8. Determine landing path based on user preference (or fallback)
    let landingPath = "/"; // Default: home page

    if (sessionUserId) {
      try {
        const pref = await prisma.userPreference.findUnique({
          where: { userId: sessionUserId },
        });
        if (pref) {
          switch (pref.nfcLandingMode) {
            case "home":
              landingPath = "/";
              break;
            case "list":
              landingPath = "/list";
              break;
            case "custom":
              landingPath = pref.nfcLandingPath || "/";
              break;
            default:
              landingPath = "/";
          }
        }
        console.log(`[NFC Tap] ${deviceHint.toUpperCase()} - User ${sessionUserId} pref: ${landingPath}`);
      } catch (prefError) {
        console.warn(`[NFC Tap] ${deviceHint.toUpperCase()} - Preference read failed:`, prefError);
      }
    }

    // Build redirect URL with attribution params
    const landingUrl = new URL(`${baseUrl}${landingPath}`);
    landingUrl.searchParams.set("srcBatch", batchSlug);
    landingUrl.searchParams.set("srcTag", tagUuid);

    console.log(`[NFC Tap] ${deviceHint.toUpperCase()} - Redirecting to: ${landingUrl.toString()}`);

    return NextResponse.redirect(landingUrl, { status: 302 });
  } catch (error) {
    console.error(`[NFC Tap] ${deviceHint.toUpperCase()} - Error processing tap:`, error);
    console.error(`[NFC Tap] ${deviceHint.toUpperCase()} - Error stack:`, error instanceof Error ? error.stack : String(error));
    // Still redirect even on error — don't break the user experience
    const fallbackUrl = new URL(`${baseUrl}/`);
    fallbackUrl.searchParams.set("srcBatch", batchSlug);
    fallbackUrl.searchParams.set("srcTag", tagUuid);
    return NextResponse.redirect(fallbackUrl, { status: 302 });
  }
}
