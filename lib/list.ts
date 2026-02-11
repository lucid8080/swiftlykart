import { prisma } from "./db";
import { auth } from "./auth";
import { getServerDeviceId, getPinListId } from "./device-server";

export interface ListContext {
  userId: string | null;
  deviceId: string | null;
  pinListId: string | null;
}

/**
 * Get the current list context from session, device, or PIN
 */
export async function getListContext(): Promise<ListContext> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const deviceId = await getServerDeviceId();
  const pinListId = await getPinListId();

  return { userId, deviceId, pinListId };
}

/**
 * Resolve the current user's list
 * Priority: PIN list > User list > Device list
 */
export async function resolveCurrentList() {
  const { userId, deviceId, pinListId } = await getListContext();

  // 1. If there's a PIN-resolved list, use that
  if (pinListId) {
    try {
      const list = await prisma.list.findFirst({
        where: { id: pinListId, isArchived: false },
        include: {
          items: {
            where: { active: true },
            include: {
              groceryItem: {
                include: {
                  category: {
                    select: { id: true, name: true },
                  },
                },
              },
              productVariant: {
                include: {
                  store: {
                    select: { id: true, name: true, logo: true },
                  },
                },
              },
            },
          },
        },
      });
      if (list) return list;
    } catch (error: unknown) {
      // Fallback if productVariant relation doesn't exist (migration not applied)
      const prismaError = error as { code?: string; message?: string };
      if (prismaError?.code === 'P2009' || prismaError?.message?.includes('productVariant')) {
        const list = await prisma.list.findFirst({
          where: { id: pinListId, isArchived: false },
          include: {
            items: {
              where: { active: true },
              include: {
                groceryItem: {
                  include: {
                    category: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        });
        if (list) return list;
      } else {
        throw error;
      }
    }
  }

  // 2. If logged in, get or create user list
  if (userId) {
    let list;
    try {
      list = await prisma.list.findFirst({
        where: { ownerUserId: userId, isArchived: false },
        include: {
          items: {
            where: { active: true },
            include: {
              groceryItem: {
                include: {
                  category: {
                    select: { id: true, name: true },
                  },
                },
              },
              productVariant: {
                include: {
                  store: {
                    select: { id: true, name: true, logo: true },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error: unknown) {
      // Fallback if productVariant relation doesn't exist (migration not applied)
      const prismaError = error as { code?: string; message?: string };
      if (prismaError?.code === 'P2009' || prismaError?.message?.includes('productVariant')) {
        list = await prisma.list.findFirst({
          where: { ownerUserId: userId, isArchived: false },
          include: {
            items: {
              where: { active: true },
              include: {
                groceryItem: {
                  include: {
                    category: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        });
      } else {
        throw error;
      }
    }

    if (!list) {
      // Create new list for user
      try {
        list = await prisma.list.create({
          data: {
            name: "My Groceries",
            ownerUserId: userId,
          },
          include: {
            items: {
              where: { active: true },
              include: {
                groceryItem: {
                  include: {
                    category: {
                      select: { id: true, name: true },
                    },
                  },
                },
                productVariant: {
                  include: {
                    store: {
                      select: { id: true, name: true, logo: true },
                    },
                  },
                },
              },
            },
          },
        });
      } catch (error: unknown) {
        // Fallback if productVariant relation doesn't exist
        const prismaError = error as { code?: string; message?: string };
        if (prismaError?.code === 'P2009' || prismaError?.message?.includes('productVariant')) {
          list = await prisma.list.create({
            data: {
              name: "My Groceries",
              ownerUserId: userId,
            },
            include: {
              items: {
                where: { active: true },
                include: {
                  groceryItem: {
                    include: {
                      category: {
                        select: { id: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          });
        } else {
          throw error;
        }
      }
    }

    // Check if device has a list that should be merged
    if (deviceId) {
      await mergeDeviceListToUser(deviceId, userId, list.id);
    }

    return list;
  }

  // 3. If anonymous with device ID, get or create device list
  if (deviceId) {
    // Ensure device record exists
    let device = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      device = await prisma.device.create({
        data: { deviceId },
      });
    }

    let list;
    try {
      list = await prisma.list.findFirst({
        where: { ownerDeviceId: device.id, isArchived: false },
        include: {
          items: {
            where: { active: true },
            include: {
              groceryItem: {
                include: {
                  category: {
                    select: { id: true, name: true },
                  },
                },
              },
              productVariant: {
                include: {
                  store: {
                    select: { id: true, name: true, logo: true },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error: unknown) {
      // Fallback if productVariant relation doesn't exist (migration not applied)
      const prismaError = error as { code?: string; message?: string };
      if (prismaError?.code === 'P2009' || prismaError?.message?.includes('productVariant')) {
        list = await prisma.list.findFirst({
          where: { ownerDeviceId: device.id, isArchived: false },
          include: {
            items: {
              where: { active: true },
              include: {
                groceryItem: {
                  include: {
                    category: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        });
      } else {
        throw error;
      }
    }

    if (!list) {
      try {
        list = await prisma.list.create({
          data: {
            name: "My Groceries",
            ownerDeviceId: device.id,
          },
          include: {
            items: {
              where: { active: true },
              include: {
                groceryItem: {
                  include: {
                    category: {
                      select: { id: true, name: true },
                    },
                  },
                },
                productVariant: {
                  include: {
                    store: {
                      select: { id: true, name: true, logo: true },
                    },
                  },
                },
              },
            },
          },
        });
      } catch (error: unknown) {
        // Fallback if productVariant relation doesn't exist
        const prismaError = error as { code?: string; message?: string };
        if (prismaError?.code === 'P2009' || prismaError?.message?.includes('productVariant')) {
          list = await prisma.list.create({
            data: {
              name: "My Groceries",
              ownerDeviceId: device.id,
            },
            include: {
              items: {
                where: { active: true },
                include: {
                  groceryItem: {
                    include: {
                      category: {
                        select: { id: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          });
        } else {
          throw error;
        }
      }
    }

    return list;
  }

  // No identity - return null (will prompt for PIN)
  return null;
}

/**
 * Merge device list items into user list when user logs in
 */
async function mergeDeviceListToUser(
  deviceId: string,
  userId: string,
  userListId: string
): Promise<void> {
  const device = await prisma.device.findUnique({
    where: { deviceId },
  });

  if (!device) return;

  const deviceList = await prisma.list.findFirst({
    where: { ownerDeviceId: device.id, isArchived: false },
    include: {
      items: {
        where: { active: true },
      },
    },
  });

  if (!deviceList || deviceList.items.length === 0) return;

      // Merge items (union of both lists)
      for (const item of deviceList.items) {
        // Handle null productVariantId separately (can't use in unique constraint)
        if (item.productVariantId) {
          await prisma.listItem.upsert({
            where: {
              listId_groceryItemId_productVariantId: {
                listId: userListId,
                groceryItemId: item.groceryItemId,
                productVariantId: item.productVariantId,
              },
            },
            update: { active: true },
            create: {
              listId: userListId,
              groceryItemId: item.groceryItemId,
              productVariantId: item.productVariantId,
              active: true,
            },
          });
        } else {
          // When productVariantId is null, use findFirst + create/update
          const existing = await prisma.listItem.findFirst({
            where: {
              listId: userListId,
              groceryItemId: item.groceryItemId,
              productVariantId: null,
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
                listId: userListId,
                groceryItemId: item.groceryItemId,
                productVariantId: null,
                active: true,
              },
            });
          }
        }
      }

  // Archive device list
  await prisma.list.update({
    where: { id: deviceList.id },
    data: { isArchived: true },
  });

  // Link device to user
  await prisma.device.update({
    where: { id: device.id },
    data: { userId },
  });
}

/**
 * Toggle item in list (add/remove)
 * Supports both generic items and store-specific product variants
 */
export async function toggleListItem(
  listId: string,
  groceryItemId: string,
  productVariantId?: string | null
): Promise<{ active: boolean }> {
  try {
    // Try to use the new constraint with productVariantId (if migration applied)
    // Check if item exists with this specific combination
    const existingItem = await prisma.listItem.findFirst({
      where: {
        listId,
        groceryItemId,
        productVariantId: productVariantId || null,
      },
    });

    if (existingItem) {
      // Toggle active state
      const updated = await prisma.listItem.update({
        where: { id: existingItem.id },
        data: { active: !existingItem.active },
      });
      return { active: updated.active };
    } else {
      // Create new item
      await prisma.listItem.create({
        data: {
          listId,
          groceryItemId,
          productVariantId: productVariantId || null,
          active: true,
        },
      });
      return { active: true };
    }
  } catch (error: unknown) {
    // If productVariantId field doesn't exist (migration not applied), fall back to old behavior
    const prismaError = error as { code?: string; message?: string };
    if (prismaError?.code === 'P2009' || prismaError?.message?.includes('Unknown column') || prismaError?.message?.includes('productVariantId')) {
      // Fallback to old constraint (without productVariantId) - use findFirst instead
      const existingItem = await prisma.listItem.findFirst({
        where: {
          listId,
          groceryItemId,
          productVariantId: null,
        },
      });

      if (existingItem) {
        // Toggle active state
        const updated = await prisma.listItem.update({
          where: { id: existingItem.id },
          data: { active: !existingItem.active },
        });
        return { active: updated.active };
      } else {
        // Create new item (without productVariantId)
        await prisma.listItem.create({
          data: {
            listId,
            groceryItemId,
            active: true,
          },
        });
        return { active: true };
      }
    }
    // Re-throw if it's a different error
    throw error;
  }
}

/**
 * Clear all items from list (mark inactive)
 */
export async function clearListItems(listId: string): Promise<void> {
  await prisma.listItem.updateMany({
    where: { listId, active: true },
    data: { active: false },
  });
}
