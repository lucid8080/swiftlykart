import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidJobSecret, isReportingEnabled } from "@/lib/feature-flags";
import { logJobStart, logJobEnd, logJobError } from "@/lib/job-logger";

const JOB_NAME = "aggregate-daily";

/**
 * POST /api/internal/reporting/aggregate-daily
 *
 * Nightly aggregation job that computes daily stats from raw events
 * and writes them to the aggregate snapshot tables.
 *
 * Security: Requires x-internal-secret header.
 * Idempotent: Running for the same date multiple times overwrites (upsert).
 *
 * Body: { "date": "YYYY-MM-DD" } — optional, defaults to yesterday UTC
 *
 * Aggregates:
 * - DailySiteStats: Site-wide KPIs (taps, visitors, lists, items)
 * - DailyBatchStats: Per-batch stats
 * - DailyTagStats: Per-tag stats
 * - DailyItemStats: Per-item stats (MyListItem aggregation)
 * - DailyVisitorStats: Per-visitor stats with power user scoring
 *
 * Power User Scoring:
 * - Score = taps*1 + tagsTapped*2 + batchesTapped*2 + listsCreated*3 + itemsAdded*1 + itemsPurchased*5
 * - isPowerUser = score >= POWER_USER_SCORE_THRESHOLD (default: 50)
 *
 * Usage:
 *   curl -X POST /api/internal/reporting/aggregate-daily \
 *     -H "x-internal-secret: YOUR_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"date":"2026-02-12"}'
 *
 * Backfill: Run for multiple dates by calling with different date values.
 * Expected: DailyVisitorStats rows appear for visitors with taps that day.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. Validate secret
  const secret = req.headers.get("x-internal-secret");
  if (!isValidJobSecret(secret)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // 2. Check feature flag
  if (!isReportingEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Reporting is disabled" },
      { status: 404 }
    );
  }

  try {
    // 3. Parse target date
    const body = await req.json().catch(() => ({}));
    const targetDate = parseTargetDate(body?.date);
    const dateStr = formatDateStr(targetDate);

    const ctx = { jobName: JOB_NAME, date: dateStr };
    logJobStart(ctx);

    // 4. Compute UTC day boundaries
    const dayStart = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        0, 0, 0, 0
      )
    );
    const dayEnd = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        23, 59, 59, 999
      )
    );

    // The date-only value for the @db.Date column (midnight UTC)
    const dateOnly = dayStart;

    // 5. Aggregate Site Stats
    const siteStats = await aggregateSiteStats(dayStart, dayEnd);

    // 6. Aggregate Batch Stats
    const batchStats = await aggregateBatchStats(dayStart, dayEnd);

    // 7. Aggregate Tag Stats
    const tagStats = await aggregateTagStats(dayStart, dayEnd);

    // 8. Aggregate Item Stats
    const itemStats = await aggregateItemStats(dayStart, dayEnd);

    // 9. Aggregate Visitor Stats
    const visitorStats = await aggregateVisitorStats(dayStart, dayEnd);

    // 10. Upsert all results
    await upsertSiteStats(dateOnly, siteStats);
    await upsertBatchStats(dateOnly, batchStats);
    await upsertTagStats(dateOnly, tagStats);
    await upsertItemStats(dateOnly, itemStats);
    await upsertVisitorStats(dateOnly, visitorStats);

    const summary = {
      date: dateStr,
      site: siteStats,
      batches: batchStats.length,
      tags: tagStats.length,
      items: itemStats.length,
      visitors: visitorStats.length,
    };

    logJobEnd(ctx, startTime, summary);

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    logJobError({ jobName: JOB_NAME }, error, startTime);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: "Aggregation failed", details: message },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────
// Date helpers
// ──────────────────────────────────────────────────────────

function parseTargetDate(dateStr?: string): Date {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parsed = new Date(dateStr + "T00:00:00Z");
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Default: yesterday UTC
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
  );
}

function formatDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────────────────
// Site Stats aggregation
// ──────────────────────────────────────────────────────────

interface SiteStatsResult {
  tapsTotal: number;
  uniqueVisitorsEst: number;
  usersNew: number;
  usersActiveEst: number;
  listsCreated: number;
  itemsAdded: number;
  itemsPurchased: number;
}

async function aggregateSiteStats(
  dayStart: Date,
  dayEnd: Date
): Promise<SiteStatsResult> {
  const dateRange = { gte: dayStart, lte: dayEnd };

  const [
    tapsTotal,
    uniqueByAnon,
    uniqueByIpUa,
    usersNew,
    listsCreated,
    itemsAdded,
    itemsPurchased,
  ] = await Promise.all([
    // Total non-duplicate taps
    prisma.tapEvent.count({
      where: { occurredAt: dateRange, isDuplicate: false },
    }),

    // Unique visitors by anonVisitorId (filter for non-null values)
    prisma.tapEvent.groupBy({
      by: ["anonVisitorId"],
      where: {
        occurredAt: dateRange,
        isDuplicate: false,
        anonVisitorId: { not: { equals: null } },
      },
    }),

    // Unique visitors by (ipHash, userAgent) where anonVisitorId is null
    // Use raw SQL for distinct pair count
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM (
        SELECT DISTINCT "ipHash", "userAgent"
        FROM "TapEvent"
        WHERE "occurredAt" >= ${dayStart}
          AND "occurredAt" <= ${dayEnd}
          AND "isDuplicate" = false
          AND "anonVisitorId" IS NULL
          AND "ipHash" IS NOT NULL
      ) sub
    `,

    // New user accounts created that day
    prisma.user.count({
      where: { createdAt: dateRange },
    }),

    // MyList rows created that day
    prisma.myList.count({
      where: { createdAt: dateRange },
    }),

    // MyListItem rows added that day
    prisma.myListItem.count({
      where: { lastAddedAt: dateRange },
    }),

    // MyListItem rows purchased that day
    prisma.myListItem.count({
      where: { purchasedAt: dateRange },
    }),
  ]);

  const ipUaCount = Number(uniqueByIpUa[0]?.count ?? 0);
  const uniqueVisitorsEst = uniqueByAnon.length + ipUaCount;

  return {
    tapsTotal,
    uniqueVisitorsEst,
    usersNew,
    usersActiveEst: uniqueVisitorsEst, // same as unique visitors for now
    listsCreated,
    itemsAdded,
    itemsPurchased,
  };
}

// ──────────────────────────────────────────────────────────
// Batch Stats aggregation
// ──────────────────────────────────────────────────────────

interface BatchStatsRow {
  batchId: string;
  tapsTotal: number;
  uniqueVisitorsEst: number;
}

async function aggregateBatchStats(
  dayStart: Date,
  dayEnd: Date
): Promise<BatchStatsRow[]> {
  const dateRange = { gte: dayStart, lte: dayEnd };

  // Group taps by batchId
  const batchGroups = await prisma.tapEvent.groupBy({
    by: ["batchId"],
    where: { occurredAt: dateRange, isDuplicate: false },
    _count: { id: true },
  });

  // For each batch, estimate unique visitors
  const results: BatchStatsRow[] = [];

  for (const group of batchGroups) {
    const uniqueByAnon = await prisma.tapEvent.groupBy({
      by: ["anonVisitorId"],
      where: {
        occurredAt: dateRange,
        isDuplicate: false,
        batchId: group.batchId,
        anonVisitorId: { not: { equals: null } },
      },
    });

    const uniqueByIpUa = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM (
        SELECT DISTINCT "ipHash", "userAgent"
        FROM "TapEvent"
        WHERE "occurredAt" >= ${dayStart}
          AND "occurredAt" <= ${dayEnd}
          AND "isDuplicate" = false
          AND "batchId" = ${group.batchId}
          AND "anonVisitorId" IS NULL
          AND "ipHash" IS NOT NULL
      ) sub
    `;

    results.push({
      batchId: group.batchId,
      tapsTotal: group._count.id,
      uniqueVisitorsEst:
        uniqueByAnon.length + Number(uniqueByIpUa[0]?.count ?? 0),
    });
  }

  return results;
}

// ──────────────────────────────────────────────────────────
// Tag Stats aggregation
// ──────────────────────────────────────────────────────────

interface TagStatsRow {
  tagId: string;
  tapsTotal: number;
  uniqueVisitorsEst: number;
}

async function aggregateTagStats(
  dayStart: Date,
  dayEnd: Date
): Promise<TagStatsRow[]> {
  const dateRange = { gte: dayStart, lte: dayEnd };

  const tagGroups = await prisma.tapEvent.groupBy({
    by: ["tagId"],
    where: { occurredAt: dateRange, isDuplicate: false },
    _count: { id: true },
  });

  const results: TagStatsRow[] = [];

  for (const group of tagGroups) {
    const uniqueByAnon = await prisma.tapEvent.groupBy({
      by: ["anonVisitorId"],
      where: {
        occurredAt: dateRange,
        isDuplicate: false,
        tagId: group.tagId,
        anonVisitorId: { not: { equals: null } },
      },
    });

    const uniqueByIpUa = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM (
        SELECT DISTINCT "ipHash", "userAgent"
        FROM "TapEvent"
        WHERE "occurredAt" >= ${dayStart}
          AND "occurredAt" <= ${dayEnd}
          AND "isDuplicate" = false
          AND "tagId" = ${group.tagId}
          AND "anonVisitorId" IS NULL
          AND "ipHash" IS NOT NULL
      ) sub
    `;

    results.push({
      tagId: group.tagId,
      tapsTotal: group._count.id,
      uniqueVisitorsEst:
        uniqueByAnon.length + Number(uniqueByIpUa[0]?.count ?? 0),
    });
  }

  return results;
}

// ──────────────────────────────────────────────────────────
// Item Stats aggregation
// ──────────────────────────────────────────────────────────

interface ItemStatsRow {
  itemKey: string;
  addedCount: number;
  purchasedCount: number;
}

async function aggregateItemStats(
  dayStart: Date,
  dayEnd: Date
): Promise<ItemStatsRow[]> {
  const dateRange = { gte: dayStart, lte: dayEnd };

  // Items added that day (grouped by itemKey)
  const addedGroups = await prisma.myListItem.groupBy({
    by: ["itemKey"],
    where: { lastAddedAt: dateRange },
    _count: { id: true },
  });

  // Items purchased that day (grouped by itemKey)
  const purchasedGroups = await prisma.myListItem.groupBy({
    by: ["itemKey"],
    where: { purchasedAt: dateRange },
    _count: { id: true },
  });

  // Merge the two into a single map
  const itemMap = new Map<string, ItemStatsRow>();

  for (const g of addedGroups) {
    itemMap.set(g.itemKey, {
      itemKey: g.itemKey,
      addedCount: g._count.id,
      purchasedCount: 0,
    });
  }

  for (const g of purchasedGroups) {
    const existing = itemMap.get(g.itemKey);
    if (existing) {
      existing.purchasedCount = g._count.id;
    } else {
      itemMap.set(g.itemKey, {
        itemKey: g.itemKey,
        addedCount: 0,
        purchasedCount: g._count.id,
      });
    }
  }

  return Array.from(itemMap.values());
}

// ──────────────────────────────────────────────────────────
// Upsert helpers
// ──────────────────────────────────────────────────────────

async function upsertSiteStats(
  dateOnly: Date,
  stats: SiteStatsResult
): Promise<void> {
  await prisma.dailySiteStats.upsert({
    where: { date: dateOnly },
    create: {
      date: dateOnly,
      ...stats,
    },
    update: {
      ...stats,
    },
  });
}

async function upsertBatchStats(
  dateOnly: Date,
  rows: BatchStatsRow[]
): Promise<void> {
  for (const row of rows) {
    await prisma.dailyBatchStats.upsert({
      where: {
        date_batchId: { date: dateOnly, batchId: row.batchId },
      },
      create: {
        date: dateOnly,
        batchId: row.batchId,
        tapsTotal: row.tapsTotal,
        uniqueVisitorsEst: row.uniqueVisitorsEst,
        signupsAttributed: 0,
        listsCreated: 0,
        itemsAdded: 0,
        itemsPurchased: 0,
      },
      update: {
        tapsTotal: row.tapsTotal,
        uniqueVisitorsEst: row.uniqueVisitorsEst,
      },
    });
  }
}

async function upsertTagStats(
  dateOnly: Date,
  rows: TagStatsRow[]
): Promise<void> {
  for (const row of rows) {
    await prisma.dailyTagStats.upsert({
      where: {
        date_tagId: { date: dateOnly, tagId: row.tagId },
      },
      create: {
        date: dateOnly,
        tagId: row.tagId,
        tapsTotal: row.tapsTotal,
        uniqueVisitorsEst: row.uniqueVisitorsEst,
      },
      update: {
        tapsTotal: row.tapsTotal,
        uniqueVisitorsEst: row.uniqueVisitorsEst,
      },
    });
  }
}

async function upsertItemStats(
  dateOnly: Date,
  rows: ItemStatsRow[]
): Promise<void> {
  for (const row of rows) {
    await prisma.dailyItemStats.upsert({
      where: {
        date_itemKey: { date: dateOnly, itemKey: row.itemKey },
      },
      create: {
        date: dateOnly,
        itemKey: row.itemKey,
        addedCount: row.addedCount,
        purchasedCount: row.purchasedCount,
      },
      update: {
        addedCount: row.addedCount,
        purchasedCount: row.purchasedCount,
      },
    });
  }
}

// ──────────────────────────────────────────────────────────
// Visitor Stats aggregation
// ──────────────────────────────────────────────────────────

interface VisitorStatsRow {
  visitorId: string;
  userId: string | null;
  taps: number;
  tagsTapped: number;
  batchesTapped: number;
  listsCreated: number;
  itemsAdded: number;
  itemsPurchased: number;
  score: number;
  isPowerUser: boolean;
}

async function aggregateVisitorStats(
  dayStart: Date,
  dayEnd: Date
): Promise<VisitorStatsRow[]> {
  const dateRange = { gte: dayStart, lte: dayEnd };
  const powerUserThreshold = parseInt(
    process.env.POWER_USER_SCORE_THRESHOLD || "50",
    10
  );

  // Group TapEvent by visitorId (where visitorId IS NOT NULL)
  const visitorGroups = await prisma.tapEvent.groupBy({
    by: ["visitorId"],
    where: {
      occurredAt: dateRange,
      isDuplicate: false,
      visitorId: { not: { equals: null } },
    },
    _count: { id: true },
  });

  const results: VisitorStatsRow[] = [];

  for (const group of visitorGroups) {
    const visitorId = group.visitorId!;

    // Get distinct tagId and batchId counts for this visitor on this day
    const [tagCount, batchCount, tapEvents] = await Promise.all([
      // Distinct tagId count
      prisma.tapEvent.findMany({
        where: {
          occurredAt: dateRange,
          isDuplicate: false,
          visitorId,
        },
        select: { tagId: true },
        distinct: ["tagId"],
      }),

      // Distinct batchId count
      prisma.tapEvent.findMany({
        where: {
          occurredAt: dateRange,
          isDuplicate: false,
          visitorId,
        },
        select: { batchId: true },
        distinct: ["batchId"],
      }),

      // Get sample TapEvent to check userId (denormalized)
      prisma.tapEvent.findFirst({
        where: {
          occurredAt: dateRange,
          isDuplicate: false,
          visitorId,
        },
        select: { userId: true },
      }),
    ]);

    // Resolve userId: prefer TapEvent.userId (denormalized), fallback to Visitor.userId
    let userId: string | null = tapEvents?.userId || null;
    if (!userId) {
      const visitor = await prisma.visitor.findUnique({
        where: { id: visitorId },
        select: { userId: true },
      });
      userId = visitor?.userId || null;
    }

    // Compute list signals (straightforward via MyList.ownerVisitorId)
    const [listsCreated, itemsAdded, itemsPurchased] = await Promise.all([
      // Lists created by this visitor on this day
      prisma.myList.count({
        where: {
          ownerVisitorId: visitorId,
          createdAt: dateRange,
        },
      }),

      // Items added by this visitor on this day (via MyList join)
      prisma.myListItem.count({
        where: {
          list: {
            ownerVisitorId: visitorId,
          },
          lastAddedAt: dateRange,
        },
      }),

      // Items purchased by this visitor on this day (via MyList join)
      prisma.myListItem.count({
        where: {
          list: {
            ownerVisitorId: visitorId,
          },
          purchasedAt: dateRange,
        },
      }),
    ]);

    const taps = group._count.id;
    const tagsTapped = tagCount.length;
    const batchesTapped = batchCount.length;

    // Compute score
    const score =
      taps * 1 +
      tagsTapped * 2 +
      batchesTapped * 2 +
      listsCreated * 3 +
      itemsAdded * 1 +
      itemsPurchased * 5;

    const isPowerUser = score >= powerUserThreshold;

    results.push({
      visitorId,
      userId,
      taps,
      tagsTapped,
      batchesTapped,
      listsCreated,
      itemsAdded,
      itemsPurchased,
      score,
      isPowerUser,
    });
  }

  return results;
}

async function upsertVisitorStats(
  dateOnly: Date,
  rows: VisitorStatsRow[]
): Promise<void> {
  for (const row of rows) {
    await prisma.dailyVisitorStats.upsert({
      where: {
        date_visitorId: { date: dateOnly, visitorId: row.visitorId },
      },
      create: {
        date: dateOnly,
        visitorId: row.visitorId,
        userId: row.userId,
        taps: row.taps,
        tagsTapped: row.tagsTapped,
        batchesTapped: row.batchesTapped,
        listsCreated: row.listsCreated,
        itemsAdded: row.itemsAdded,
        itemsPurchased: row.itemsPurchased,
        score: row.score,
        isPowerUser: row.isPowerUser,
      },
      update: {
        userId: row.userId,
        taps: row.taps,
        tagsTapped: row.tagsTapped,
        batchesTapped: row.batchesTapped,
        listsCreated: row.listsCreated,
        itemsAdded: row.itemsAdded,
        itemsPurchased: row.itemsPurchased,
        score: row.score,
        isPowerUser: row.isPowerUser,
      },
    });
  }
}
