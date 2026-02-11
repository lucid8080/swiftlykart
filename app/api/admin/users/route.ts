import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

/**
 * GET /api/admin/users
 * List all registered users with their details
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            lists: true,
            devices: true,
            sessions: true,
            identityClaims: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch linked Visitor and NFC tags for each user
    const usersWithVisitors = await Promise.all(
      users.map(async (user) => {
        const visitor = await prisma.visitor.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            anonVisitorId: true,
            tapCount: true,
            firstSeenAt: true,
            lastSeenAt: true,
          },
        });

        // Fetch NFC tags this user has tapped (via TapEvent.userId)
        // Get all tap events for this user and aggregate by tag
        const tapEventsForCount = await prisma.tapEvent.findMany({
          where: {
            userId: user.id,
            isDuplicate: false,
          },
          select: {
            tagId: true,
            tag: {
              select: {
                id: true,
                publicUuid: true,
                label: true,
                status: true,
                batch: {
                  select: {
                    slug: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Aggregate unique tags with tap counts
        const tagMap = new Map();
        tapEventsForCount.forEach((event) => {
          const tagId = event.tag.id;
          if (!tagMap.has(tagId)) {
            tagMap.set(tagId, {
              ...event.tag,
              tapCount: 0,
            });
          }
          tagMap.get(tagId).tapCount++;
        });

        const nfcTags = Array.from(tagMap.values()).sort((a, b) => b.tapCount - a.tapCount);

        // Fetch the user's grocery list items (from List model)
        const userList = await prisma.list.findFirst({
          where: { ownerUserId: user.id },
          orderBy: { updatedAt: "desc" },
          include: {
            items: {
              where: { active: true },
              include: {
                groceryItem: {
                  select: { id: true, name: true, icon: true },
                },
                productVariant: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    store: { select: { id: true, name: true } },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        // Also fetch MyList items (NFC visitor list, may be claimed)
        const myList = await prisma.myList.findFirst({
          where: { ownerUserId: user.id },
          orderBy: { updatedAt: "desc" },
          include: {
            items: {
              orderBy: { lastAddedAt: "desc" },
              select: {
                id: true,
                itemKey: true,
                itemLabel: true,
                quantity: true,
                timesPurchased: true,
                purchasedAt: true,
                lastAddedAt: true,
              },
            },
          },
        });

        return {
          ...user,
          visitor: visitor
            ? {
                id: visitor.id,
                anonVisitorId: visitor.anonVisitorId,
                tapCount: visitor.tapCount,
                firstSeenAt: visitor.firstSeenAt,
                lastSeenAt: visitor.lastSeenAt,
              }
            : null,
          nfcTags,
          listItems: userList?.items.map((item) => ({
            id: item.id,
            groceryItemId: item.groceryItem.id,
            name: item.groceryItem.name,
            icon: item.groceryItem.icon,
            variantName: item.productVariant?.name || null,
            storeName: item.productVariant?.store?.name || null,
            price: item.productVariant?.price || null,
          })) || [],
          myListItems: myList?.items.map((item) => ({
            id: item.id,
            itemKey: item.itemKey,
            itemLabel: item.itemLabel,
            quantity: item.quantity,
            timesPurchased: item.timesPurchased,
            purchased: !!item.purchasedAt,
          })) || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: usersWithVisitors,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
