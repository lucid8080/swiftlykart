import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getServerDeviceId } from "@/lib/device-server";
import type { ApiResponse } from "@/lib/zod";

/**
 * POST /api/device/link
 * Links the current device to the authenticated user's account
 */
export async function POST(): Promise<NextResponse<ApiResponse<{ linked: boolean }>>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get device ID
    const deviceId = await getServerDeviceId();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "No device ID found", code: "NO_DEVICE" },
        { status: 400 }
      );
    }

    // Find or create device record
    let device = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      device = await prisma.device.create({
        data: {
          deviceId,
          userId: session.user.id,
        },
      });
    } else if (device.userId !== session.user.id) {
      // Link device to user
      await prisma.device.update({
        where: { id: device.id },
        data: { userId: session.user.id },
      });
    }

    // Merge any device list items to user list
    const deviceList = await prisma.list.findFirst({
      where: { ownerDeviceId: device.id, isArchived: false },
      include: { items: { where: { active: true } } },
    });

    if (deviceList && deviceList.items.length > 0) {
      // Get or create user list
      let userList = await prisma.list.findFirst({
        where: { ownerUserId: session.user.id, isArchived: false },
      });

      if (!userList) {
        userList = await prisma.list.create({
          data: {
            name: "My Groceries",
            ownerUserId: session.user.id,
          },
        });
      }

      // Merge items
      for (const item of deviceList.items) {
        // Use findFirst + create/update since productVariantId might be null
        const existing = await prisma.listItem.findFirst({
          where: {
            listId: userList.id,
            groceryItemId: item.groceryItemId,
            productVariantId: item.productVariantId || null,
          },
        });

        if (existing) {
          await prisma.listItem.update({
            where: { id: existing.id },
            data: { active: true },
          });
        } else {
          await prisma.listItem.create({
            data: {
              listId: userList.id,
              groceryItemId: item.groceryItemId,
              productVariantId: item.productVariantId || null,
              active: true,
            },
          });
        }
      }

      // Archive device list
      await prisma.list.update({
        where: { id: deviceList.id },
        data: { isArchived: true },
      });
    }

    return NextResponse.json({ success: true, data: { linked: true } });
  } catch (error: unknown) {
    console.error("Error linking device:", error);
    return NextResponse.json(
      { success: false, error: "Failed to link device", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
