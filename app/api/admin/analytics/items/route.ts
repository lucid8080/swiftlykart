import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/analytics/items?days=30
 * My List item analytics: most purchased, most added, per-batch popularity.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam) : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const [
      mostPurchased,
      mostAdded,
      powerUsersByPurchase,
      perBatchItems,
    ] = await Promise.all([
      // Most purchased items (top 20)
      prisma.myListItem.groupBy({
        by: ["itemKey", "itemLabel"],
        _sum: { timesPurchased: true },
        _count: true,
        orderBy: { _sum: { timesPurchased: "desc" } },
        take: 20,
        where: { timesPurchased: { gt: 0 } },
      }),

      // Most added items (top 20 by count of MyListItem rows)
      prisma.myListItem.groupBy({
        by: ["itemKey", "itemLabel"],
        _count: true,
        orderBy: { _count: { itemKey: "desc" } },
        take: 20,
      }),

      // Power users by purchase count (top 10)
      prisma.visitor.findMany({
        take: 10,
        orderBy: { tapCount: "desc" },
        where: { tapCount: { gt: 0 } },
        include: {
          myLists: {
            include: {
              items: {
                where: { timesPurchased: { gt: 0 } },
              },
            },
          },
        },
      }),

      // Per-batch item popularity (top items grouped by attributed batch)
      prisma.myListItem.groupBy({
        by: ["sourceBatchId", "itemKey", "itemLabel"],
        _sum: { timesPurchased: true },
        _count: true,
        orderBy: { _sum: { timesPurchased: "desc" } },
        take: 50,
        where: {
          sourceBatchId: { not: null },
          timesPurchased: { gt: 0 },
        },
      }),
    ]);

    // Resolve batch names for per-batch items
    const batchIds = [
      ...new Set(
        perBatchItems
          .map((i) => i.sourceBatchId)
          .filter(Boolean) as string[]
      ),
    ];
    const batches = batchIds.length > 0
      ? await prisma.tagBatch.findMany({
          where: { id: { in: batchIds } },
          select: { id: true, slug: true, name: true },
        })
      : [];
    const batchMap = new Map(batches.map((b) => [b.id, b]));

    return NextResponse.json({
      success: true,
      data: {
        period: { days, since },
        mostPurchased: mostPurchased.map((item) => ({
          itemKey: item.itemKey,
          itemLabel: item.itemLabel,
          totalPurchases: item._sum.timesPurchased || 0,
          listCount: item._count,
        })),
        mostAdded: mostAdded.map((item) => ({
          itemKey: item.itemKey,
          itemLabel: item.itemLabel,
          addCount: item._count,
        })),
        powerUsers: powerUsersByPurchase.map((v) => {
          const totalPurchases = v.myLists.reduce(
            (sum, list) =>
              sum +
              list.items.reduce((s, item) => s + item.timesPurchased, 0),
            0
          );
          return {
            id: v.id,
            anonVisitorId: v.anonVisitorId,
            tapCount: v.tapCount,
            totalPurchases,
          };
        }),
        perBatchItems: perBatchItems.map((item) => ({
          batch: item.sourceBatchId
            ? batchMap.get(item.sourceBatchId) || null
            : null,
          itemKey: item.itemKey,
          itemLabel: item.itemLabel,
          totalPurchases: item._sum.timesPurchased || 0,
          listCount: item._count,
        })),
      },
    });
  } catch (error) {
    console.error("[Admin Analytics Items] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
