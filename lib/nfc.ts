import { createHash } from "crypto";
import { prisma } from "./db";

// ─── IP Hashing ───────────────────────────────────────
// Hash IP with server-side salt for privacy-safe "unique-ish" tracking
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "default-salt-change-me";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

// ─── Device Hint ──────────────────────────────────────
// Derive device type from User-Agent string
export function deriveDeviceHint(
  userAgent: string | null
): "mobile" | "desktop" | "tablet" {
  if (!userAgent) return "desktop";
  const ua = userAgent.toLowerCase();

  // Tablets first (before mobile, since some tablets include "mobile")
  if (
    ua.includes("ipad") ||
    ua.includes("tablet") ||
    (ua.includes("android") && !ua.includes("mobile"))
  ) {
    return "tablet";
  }

  // Mobile
  if (
    ua.includes("mobile") ||
    ua.includes("iphone") ||
    ua.includes("ipod") ||
    ua.includes("android") ||
    ua.includes("webos") ||
    ua.includes("blackberry") ||
    ua.includes("opera mini") ||
    ua.includes("iemobile")
  ) {
    return "mobile";
  }

  return "desktop";
}

// ─── Tap Deduplication ────────────────────────────────
// Check if a duplicate tap exists within the given time window
export async function findDuplicateTap(
  tagId: string,
  anonVisitorId: string | null,
  ipHash: string | null,
  userAgent: string | null,
  withinMinutes: number = 2
): Promise<string | null> {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);

  // Strategy 1: Match by anonVisitorId if available
  if (anonVisitorId) {
    const existing = await prisma.tapEvent.findFirst({
      where: {
        tagId,
        anonVisitorId,
        occurredAt: { gte: cutoff },
        isDuplicate: false,
      },
      orderBy: { occurredAt: "desc" },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  // Strategy 2: Match by ipHash + userAgent fingerprint
  if (ipHash && userAgent) {
    const existing = await prisma.tapEvent.findFirst({
      where: {
        tagId,
        ipHash,
        userAgent,
        occurredAt: { gte: cutoff },
        isDuplicate: false,
      },
      orderBy: { occurredAt: "desc" },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  return null;
}

// ─── Extract Client IP ───────────────────────────────
// Get IP from request headers (works behind proxies)
export function extractClientIp(request: Request): string | null {
  // Check x-forwarded-for first (load balancers / proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  // Check x-real-ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return null;
}

// ─── Visitor Upsert ──────────────────────────────────
// Create or update a Visitor record.
// Only increments tapCount when tagId is provided (actual NFC tap),
// not on general identify calls.
export async function upsertVisitor(
  anonVisitorId: string,
  tagId?: string | null,
  batchId?: string | null
) {
  const isActualTap = !!tagId;

  return prisma.visitor.upsert({
    where: { anonVisitorId },
    create: {
      anonVisitorId,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      tapCount: isActualTap ? 1 : 0,
      lastTagId: tagId || null,
      lastBatchId: batchId || null,
    },
    update: {
      lastSeenAt: new Date(),
      ...(isActualTap ? { tapCount: { increment: 1 } } : {}),
      ...(tagId ? { lastTagId: tagId } : {}),
      ...(batchId ? { lastBatchId: batchId } : {}),
    },
  });
}
