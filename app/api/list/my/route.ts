import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/list/my?vid=...&srcBatch=...&srcTag=...
 * Load the visitor's MyList items.
 */
export async function GET(request: NextRequest) {
  const vid = request.nextUrl.searchParams.get("vid");
  const srcBatch = request.nextUrl.searchParams.get("srcBatch");
  const srcTag = request.nextUrl.searchParams.get("srcTag");

  if (!vid) {
    return NextResponse.json({
      success: true,
      data: { items: [] },
    });
  }

  try {
    // Find or create visitor
    const visitor = await prisma.visitor.upsert({
      where: { anonVisitorId: vid },
      create: { anonVisitorId: vid },
      update: { lastSeenAt: new Date() },
    });

    // Find attribution IDs
    let sourceBatchId: string | null = null;
    let sourceTagId: string | null = null;
    if (srcBatch) {
      const batch = await prisma.tagBatch.findUnique({ where: { slug: srcBatch } });
      if (batch) sourceBatchId = batch.id;
    }
    if (srcTag) {
      const tag = await prisma.nfcTag.findUnique({ where: { publicUuid: srcTag } });
      if (tag) sourceTagId = tag.id;
    }

    // Find or create MyList for this visitor
    let myList = await prisma.myList.findFirst({
      where: { ownerVisitorId: visitor.id },
      include: {
        items: {
          orderBy: { lastAddedAt: "desc" },
        },
      },
    });

    if (!myList) {
      myList = await prisma.myList.create({
        data: {
          ownerVisitorId: visitor.id,
          sourceBatchId,
          sourceTagId,
        },
        include: {
          items: {
            orderBy: { lastAddedAt: "desc" },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { items: myList.items },
    });
  } catch (error) {
    console.error("[MyList GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/list/my
 * Add an item to the visitor's MyList.
 * Body: { anonVisitorId, itemLabel, srcBatch?, srcTag? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anonVisitorId, itemLabel, srcBatch, srcTag } = body;

    if (!itemLabel || typeof itemLabel !== "string") {
      return NextResponse.json(
        { success: false, error: "itemLabel is required" },
        { status: 400 }
      );
    }

    const itemKey = itemLabel.trim().toLowerCase().replace(/\s+/g, "-");

    // Find or create visitor
    let visitorId: string | null = null;
    if (anonVisitorId) {
      const visitor = await prisma.visitor.upsert({
        where: { anonVisitorId },
        create: { anonVisitorId },
        update: { lastSeenAt: new Date() },
      });
      visitorId = visitor.id;
    }

    // Find attribution
    let sourceBatchId: string | null = null;
    let sourceTagId: string | null = null;
    if (srcBatch) {
      const batch = await prisma.tagBatch.findUnique({ where: { slug: srcBatch } });
      if (batch) sourceBatchId = batch.id;
    }
    if (srcTag) {
      const tag = await prisma.nfcTag.findUnique({ where: { publicUuid: srcTag } });
      if (tag) sourceTagId = tag.id;
    }

    // Find or create MyList
    let myList = visitorId
      ? await prisma.myList.findFirst({ where: { ownerVisitorId: visitorId } })
      : null;

    if (!myList) {
      myList = await prisma.myList.create({
        data: {
          ownerVisitorId: visitorId,
          sourceBatchId,
          sourceTagId,
        },
      });
    }

    // Upsert the item (if already exists, update lastAddedAt)
    const item = await prisma.myListItem.upsert({
      where: {
        listId_itemKey: {
          listId: myList.id,
          itemKey,
        },
      },
      create: {
        listId: myList.id,
        itemKey,
        itemLabel: itemLabel.trim(),
        quantity: 1,
        lastAddedAt: new Date(),
        sourceBatchId,
        sourceTagId,
      },
      update: {
        lastAddedAt: new Date(),
        quantity: { increment: 1 },
        purchasedAt: null, // un-purchase if re-added
      },
    });

    return NextResponse.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    console.error("[MyList POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/list/my
 * Update item: mark purchased or update quantity.
 * Body: { anonVisitorId, itemId, action: "purchase" | "quantity", delta?: number }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, action, delta } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "itemId is required" },
        { status: 400 }
      );
    }

    const item = await prisma.myListItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    if (action === "purchase") {
      await prisma.myListItem.update({
        where: { id: itemId },
        data: {
          purchasedAt: new Date(),
          timesPurchased: { increment: 1 },
        },
      });
    } else if (action === "quantity" && typeof delta === "number") {
      const newQty = Math.max(1, (item.quantity || 1) + delta);
      await prisma.myListItem.update({
        where: { id: itemId },
        data: { quantity: newQty },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MyList PUT] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/list/my
 * Remove an item from the list.
 * Body: { anonVisitorId, itemId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "itemId is required" },
        { status: 400 }
      );
    }

    await prisma.myListItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MyList DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
