import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiResponse, Store, ProductVariant } from "@/lib/zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/items/[id]/variants
 * Returns all stores and product variants for a specific grocery item
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ stores: Store[]; variants: ProductVariant[] }>>> {
  try {
    const { id } = await params;

    // Verify item exists
    const item = await prisma.groceryItem.findUnique({
      where: { id },
    });

    if (!item) {
      console.error(`Grocery item not found with ID: ${id}`);
      // Try to find by name for debugging
      const allItems = await prisma.groceryItem.findMany({
        select: { id: true, name: true },
        take: 5,
      });
      console.log("Sample grocery items in database:", allItems);
      
      return NextResponse.json(
        { success: false, error: "Grocery item not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check if Store model exists in Prisma client (needs regeneration)
    const prismaKeys = Object.keys(prisma).filter(k => !k.startsWith('_') && k !== '$connect' && k !== '$disconnect' && k !== '$transaction' && k !== '$use' && k !== '$on' && k !== '$extends');
    const hasStoreModel = 'store' in prisma && prisma.store && typeof (prisma.store as { findMany?: unknown }).findMany === 'function';
    
    if (!hasStoreModel) {
      console.log("⚠️ Store model not available in Prisma client");
      console.log("⚠️ Available Prisma models:", prismaKeys);
      console.log("⚠️ 'store' in prisma:", 'store' in prisma);
      console.log("⚠️ prisma.store:", prisma.store);
      console.log("⚠️ ACTION REQUIRED: Stop the dev server, then run: npx prisma generate");
      return NextResponse.json({
        success: true,
        data: {
          stores: [],
          variants: [],
        },
      });
    }

    // Check if Store table exists by trying to query it
    let stores: Array<{ id: string; name: string; logo: string | null }> = [];
    try {
      stores = await prisma.store.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          logo: true,
        },
      });
    } catch (error: unknown) {
      // If Store table doesn't exist (migration not run), return empty
      const prismaError = error as { code?: string; message?: string };
      if (prismaError?.code === 'P2001' || prismaError?.message?.includes('does not exist') || prismaError?.message?.includes('Store') || prismaError?.message?.includes('Cannot read properties')) {
        console.log("Store table doesn't exist yet (migration not run)");
        return NextResponse.json({
          success: true,
          data: {
            stores: [],
            variants: [],
          },
        });
      }
      throw error;
    }

    // If no stores exist and this is Apples, create test data
    // Only try to create if the tables exist
    if (stores.length === 0 && item.name === "Apples") {
      try {
        console.log("Creating test stores and variants for Apples...");
        
        const testStores = [
        { name: "Loblaws", logo: null },
        { name: "Metro", logo: null },
        { name: "Sobeys", logo: null },
        { name: "Real Canadian Superstore", logo: null },
        { name: "No Frills", logo: null },
        { name: "FreshCo", logo: null },
        { name: "Food Basics", logo: null },
        { name: "Longo's", logo: null },
        { name: "Whole Foods", logo: null },
        { name: "Costco", logo: null },
        { name: "Walmart", logo: null },
        { name: "T&T Supermarket", logo: null },
      ];

      const createdStores = [];
      for (const storeData of testStores) {
        try {
          const store = await prisma.store.create({
            data: {
              name: storeData.name,
              logo: storeData.logo,
            },
            select: {
              id: true,
              name: true,
              logo: true,
            },
          });
          createdStores.push(store);
        } catch (error: unknown) {
          // Store might already exist, try to find it
          const _err = error as { code?: string; message?: string };
          const existing = await prisma.store.findUnique({
            where: { name: storeData.name },
            select: {
              id: true,
              name: true,
              logo: true,
            },
          });
          if (existing) {
            createdStores.push(existing);
          }
        }
      }

      stores = createdStores;

      // Create apple variants (Canadian stores)
      const appleVariants = [
        { store: "Loblaws", name: "Gala Apples", price: 3.99 },
        { store: "Loblaws", name: "Red Delicious Apples", price: 3.49 },
        { store: "Loblaws", name: "Honeycrisp Apples", price: 5.99 },
        { store: "Metro", name: "Gala Apples", price: 3.89 },
        { store: "Metro", name: "Honeycrisp Apples", price: 5.79 },
        { store: "Sobeys", name: "Gala Apples", price: 4.19 },
        { store: "Sobeys", name: "Honeycrisp Apples", price: 6.29 },
        { store: "Real Canadian Superstore", name: "Gala Apples", price: 3.49 },
        { store: "Real Canadian Superstore", name: "Red Delicious Apples", price: 2.99 },
        { store: "No Frills", name: "Gala Apples", price: 2.99 },
        { store: "No Frills", name: "Red Delicious Apples", price: 2.79 },
        { store: "FreshCo", name: "Gala Apples", price: 3.29 },
        { store: "Food Basics", name: "Gala Apples", price: 2.89 },
        { store: "Longo's", name: "Organic Gala Apples", price: 5.99 },
        { store: "Whole Foods", name: "Organic Gala Apples", price: 6.49 },
        { store: "Whole Foods", name: "Organic Honeycrisp Apples", price: 7.99 },
        { store: "Costco", name: "Gala Apples (3kg bag)", price: 8.99 },
        { store: "Costco", name: "Honeycrisp Apples (3kg bag)", price: 12.99 },
        { store: "Walmart", name: "Gala Apples", price: 3.29 },
        { store: "Walmart", name: "Red Delicious Apples", price: 2.99 },
        { store: "T&T Supermarket", name: "Fuji Apples", price: 3.99 },
      ];

      for (const variantData of appleVariants) {
        const store = createdStores.find((s) => s.name === variantData.store);
        if (store) {
          try {
            await prisma.productVariant.create({
              data: {
                groceryItemId: id,
                storeId: store.id,
                name: variantData.name,
                price: variantData.price,
                imageUrl: null,
              },
            });
          } catch (error: unknown) {
            // Variant might already exist, skip
            const err = error as { message?: string };
            if (!err.message?.includes("Unique constraint")) {
              console.error("Error creating variant:", error);
            }
          }
        }
      }
      } catch (createError: unknown) {
        // If we can't create (tables don't exist or Prisma client not regenerated), just return empty arrays
        const err = createError as { message?: string };
        console.log("Could not create test data:", err?.message);
        // Continue to return empty arrays below
      }
    }

    // Check if ProductVariant model exists in Prisma client
    const hasProductVariantModel = 'productVariant' in prisma && prisma.productVariant && typeof (prisma.productVariant as { findMany?: unknown }).findMany === 'function';
    if (!hasProductVariantModel) {
      console.log("⚠️ ProductVariant model not available in Prisma client");
      console.log("⚠️ Run: npx prisma generate");
      return NextResponse.json({
        success: true,
        data: {
          stores: [],
          variants: [],
        },
      });
    }

    // Fetch all variants for this item
    let variants = [];
    try {
      variants = await prisma.productVariant.findMany({
        where: { groceryItemId: id },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
        orderBy: [{ store: { name: "asc" } }, { name: "asc" }],
      });
    } catch (error: unknown) {
      // If ProductVariant table doesn't exist, return empty
      const prismaError = error as { code?: string; message?: string };
      if (prismaError?.code === 'P2001' || prismaError?.message?.includes('does not exist') || prismaError?.message?.includes('ProductVariant') || prismaError?.message?.includes('Cannot read properties')) {
        console.log("ProductVariant table doesn't exist yet (migration not run)");
        return NextResponse.json({
          success: true,
          data: {
            stores: [],
            variants: [],
          },
        });
      }
      throw error;
    }

    // Format variants
    const formattedVariants: ProductVariant[] = variants.map((v) => ({
      id: v.id,
      groceryItemId: v.groceryItemId,
      storeId: v.storeId,
      name: v.name,
      imageUrl: v.imageUrl,
      price: v.price,
      store: v.store,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stores: stores as Store[],
        variants: formattedVariants,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error fetching variants:", error);
    
    // If Store/ProductVariant tables don't exist (migration not run), return empty arrays
    if (error?.code === 'P2001' || error?.message?.includes('does not exist') || error?.message?.includes('Store') || error?.message?.includes('ProductVariant')) {
      console.log("Store/ProductVariant tables don't exist yet, returning empty arrays");
      return NextResponse.json({
        success: true,
        data: {
          stores: [],
          variants: [],
        },
      });
    }
    
    return NextResponse.json(
      { success: false, error: `Failed to fetch variants: ${error?.message || 'Unknown error'}`, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
