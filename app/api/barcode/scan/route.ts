import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveCurrentList, ensureListItem } from "@/lib/list";
import type { ApiResponse } from "@/lib/zod";

interface OpenFoodFactsProduct {
  code: string;
  status: number;
  status_verbose: string;
  product?: {
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    image_url?: string;
    image_front_url?: string;
    image_front_small_url?: string;
    categories?: string;
    categories_tags?: string[];
    nutriments?: {
      energy_kcal_100g?: number;
    };
  };
}

/**
 * Maps OpenFoodFacts category tags to our Category names
 */
function mapCategory(offCategories: string[] = []): string {
  const categoryMap: Record<string, string> = {
    "en:fruits": "Produce",
    "en:vegetables": "Produce",
    "en:dairy": "Dairy",
    "en:meats": "Meat",
    "en:fish": "Meat",
    "en:seafood": "Meat",
    "en:cereals": "Pantry",
    "en:pasta": "Pantry",
    "en:bread": "Bakery",
    "en:beverages": "Beverages",
    "en:snacks": "Snacks",
    "en:frozen-foods": "Frozen",
    "en:household": "Household",
  };

  // Check each category tag
  for (const tag of offCategories) {
    for (const [offTag, ourCategory] of Object.entries(categoryMap)) {
      if (tag.includes(offTag)) {
        return ourCategory;
      }
    }
  }

  // Default fallback
  return "Pantry";
}

/**
 * Maps brand names to store names based on store brands
 */
function mapBrandToStore(brands: string | undefined): string | null {
  if (!brands) return null;

  const brandLower = brands.toLowerCase();
  
  // Store brand mappings (Canadian stores)
  const brandToStoreMap: Record<string, string> = {
    // Loblaws brands
    "president's choice": "Loblaws",
    "pc": "Loblaws",
    "no name": "No Frills",
    "no name.": "No Frills",
    "no name brand": "No Frills",
    "selection": "Metro",
    "irresistibles": "Metro",
    "complements": "Sobeys",
    "compliments": "Sobeys",
    "our compliments": "Sobeys",
    "western family": "Real Canadian Superstore",
    "great value": "Walmart",
    "kirkland": "Costco",
    "kirkland signature": "Costco",
    "365": "Whole Foods",
    "365 by whole foods": "Whole Foods",
    "t&t": "T&T Supermarket",
    "tt supermarket": "T&T Supermarket",
    "freshco": "FreshCo",
    "food basics": "Food Basics",
    "longo's": "Longo's",
  };

  // Split brands by comma and check each one
  const brandList = brandLower.split(',').map(b => b.trim());
  
  // Check for exact matches or partial matches in each brand
  for (const brand of brandList) {
    for (const [mappedBrand, store] of Object.entries(brandToStoreMap)) {
      if (brand.includes(mappedBrand) || mappedBrand.includes(brand)) {
        return store;
      }
    }
  }

  return null;
}

/**
 * Gets or creates common stores for product variants
 */
async function getOrCreateStores(storeNames: string[]): Promise<Array<{ id: string; name: string }>> {
  const stores = [];
  
  for (const storeName of storeNames) {
    let store = await prisma.store.findUnique({
      where: { name: storeName },
    });

    if (!store) {
      store = await prisma.store.create({
        data: { name: storeName },
      });
    }
    
    stores.push({ id: store.id, name: store.name });
  }
  
  return stores;
}

/**
 * Adds an item to MyList immediately with just the product name.
 * This is called early in the flow (right after productName is known) to make items appear instantly.
 * Returns true if successful, false otherwise (doesn't throw).
 */
async function addToMyListByName(
  anonVisitorId: string,
  productName: string,
  srcBatch?: string,
  srcTag?: string
): Promise<boolean> {
  try {
    // Find or create visitor
    const visitor = await prisma.visitor.upsert({
      where: { anonVisitorId },
      create: { anonVisitorId },
      update: { lastSeenAt: new Date() },
    });

    // Find attribution (can be done in parallel with visitor upsert, but keeping sequential for simplicity)
    let sourceBatchId: string | null = null;
    let sourceTagId: string | null = null;
    
    if (srcBatch) {
      try {
        const batch = await prisma.tagBatch.findUnique({ where: { slug: srcBatch } });
        if (batch) sourceBatchId = batch.id;
      } catch (err) {
        // Ignore attribution lookup errors
        console.debug("[addToMyListByName] Failed to lookup batch:", err);
      }
    }
    
    if (srcTag) {
      try {
        const tag = await prisma.nfcTag.findUnique({ where: { publicUuid: srcTag } });
        if (tag) sourceTagId = tag.id;
      } catch (err) {
        // Ignore attribution lookup errors
        console.debug("[addToMyListByName] Failed to lookup tag:", err);
      }
    }

    // Find or create MyList
    let myList = await prisma.myList.findFirst({
      where: { ownerVisitorId: visitor.id },
    });

    if (!myList) {
      myList = await prisma.myList.create({
        data: {
          ownerVisitorId: visitor.id,
          sourceBatchId,
          sourceTagId,
        },
      });
    }

    // Add item to MyList
    const itemKey = productName.trim().toLowerCase().replace(/\s+/g, "-");
    await prisma.myListItem.upsert({
      where: {
        listId_itemKey: {
          listId: myList.id,
          itemKey,
        },
      },
      create: {
        listId: myList.id,
        itemKey,
        itemLabel: productName.trim(),
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

    console.log(`[addToMyListByName] Instantly added ${productName} to MyList`);
    return true;
  } catch (error) {
    console.error("[addToMyListByName] Error:", error);
    return false;
  }
}

/**
 * POST /api/barcode/scan
 * Scans a barcode, fetches product from OpenFoodFacts, and adds to list
 */
export async function POST(request: Request): Promise<NextResponse<ApiResponse>> {
  let barcode: string | undefined;
  try {
    const body = await request.json();
    barcode = body.barcode;
    const anonVisitorId = body.anonVisitorId || request.headers.get("X-Anon-Visitor-Id");

    if (!barcode || typeof barcode !== "string") {
      return NextResponse.json(
        { success: false, error: "Barcode is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Check if ProductVariant with this barcode already exists in our database FIRST
    // This allows us to skip OpenFoodFacts API call if we already have the product
    console.log(`[Barcode Scan] Checking database for barcode: ${barcode}`);
    const existingVariant = await prisma.productVariant.findUnique({
      where: { barcode },
      include: {
        groceryItem: {
          include: { category: true },
        },
      },
    });

    let groceryItemId: string;
    let variantId: string | null = null;
    let productName: string;
    let product: OpenFoodFactsProduct["product"] | null = null;

    // If product exists in database, use it directly (skip OpenFoodFacts API call)
    if (existingVariant) {
      console.log(`[Barcode Scan] Found existing product in database: ${existingVariant.groceryItem.name}`);
      groceryItemId = existingVariant.groceryItemId;
      variantId = existingVariant.id;
      productName = existingVariant.groceryItem.name;
      
      // Skip to adding item to list (we already have everything we need)
    } else {
      console.log(`[Barcode Scan] Product not in database, fetching from OpenFoodFacts: ${barcode}`);
      // Product doesn't exist in database, fetch from OpenFoodFacts
      // Fetch product from OpenFoodFacts with retry logic
    let offData: OpenFoodFactsProduct | null = null;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        const offResponse = await fetch(
          `https://world.openfoodfacts.net/api/v2/product/${barcode}.json`,
          {
            headers: {
              "User-Agent": "GroceryListPWA/1.0 (contact@example.com)",
            },
            // Add timeout to prevent hanging (10 seconds)
            signal: AbortSignal.timeout(10000),
          }
        );

        // Handle rate limiting (429) or server errors (5xx) with retry
        if (offResponse.status === 429 || (offResponse.status >= 500 && offResponse.status < 600)) {
          if (retries < maxRetries) {
            // Wait before retry: 1s for first retry, 2s for second
            await new Promise(resolve => setTimeout(resolve, (retries + 1) * 1000));
            retries++;
            continue;
          } else {
            // Max retries reached
            return NextResponse.json(
              { 
                success: false, 
                error: "Service temporarily unavailable. Please try again in a moment.", 
                code: "SERVICE_UNAVAILABLE" 
              },
              { status: 503 }
            );
          }
        }

        // Parse response
        const parsedData: OpenFoodFactsProduct = await offResponse.json();
        offData = parsedData;

        // Handle "not found" responses (status 0 or no product)
        if (parsedData.status === 0 || !parsedData.product) {
          return NextResponse.json(
            { success: false, error: "Product not found in our database", code: "NOT_FOUND" },
            { status: 404 }
          );
        }

        // Success - we have valid product data
        break; // Exit retry loop
      } catch (error: unknown) {
        // Handle network errors, timeouts, etc.
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, (retries + 1) * 1000));
          retries++;
          continue;
        } else {
          const err = error as { name?: string; message?: string };
          if (err.name === 'AbortError' || err.message?.includes('timeout')) {
            return NextResponse.json(
              { 
                success: false, 
                error: "Request timed out. Please try again.", 
                code: "TIMEOUT" 
              },
              { status: 504 }
            );
          }
          return NextResponse.json(
            { 
              success: false, 
              error: "Failed to fetch product information. Please try again.", 
              code: "NETWORK_ERROR" 
            },
            { status: 500 }
          );
        }
      }
    }

    // Final check: ensure we have valid product data
    if (!offData || offData.status === 0 || !offData.product) {
      return NextResponse.json(
        { success: false, error: "Product not found in our database", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

      // TypeScript: offData is guaranteed to be non-null and have product at this point
      product = offData.product;
      productName = product.product_name_en || product.product_name || "Unknown Product";

      // Now create the product in our database
      // Need to create or find GroceryItem
      const categoryName = mapCategory(product.categories_tags);
      
      // Find or create category
      let category = await prisma.category.findUnique({
        where: { name: categoryName },
      });

      if (!category) {
        // Create category if it doesn't exist
        const maxSortOrder = await prisma.category.findFirst({
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true },
        });
        category = await prisma.category.create({
          data: {
            name: categoryName,
            sortOrder: (maxSortOrder?.sortOrder || 0) + 1,
          },
        });
      }

      // Try to find existing GroceryItem by name (fuzzy match)
      const existingItem = await prisma.groceryItem.findFirst({
        where: {
          categoryId: category.id,
          name: {
            contains: productName.split(" ")[0], // Match first word
            mode: "insensitive",
          },
        },
      });

      if (existingItem) {
        groceryItemId = existingItem.id;
      } else {
        // Create new GroceryItem
        const maxSortOrder = await prisma.groceryItem.findFirst({
          where: { categoryId: category.id },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true },
        });

        const newItem = await prisma.groceryItem.create({
          data: {
            name: productName,
            categoryId: category.id,
            sortOrder: (maxSortOrder?.sortOrder || 0) + 1,
            isActive: true,
          },
        });
        groceryItemId = newItem.id;
      }

      // Try to identify store from brand
      const identifiedStore = mapBrandToStore(product.brands);
      
      const imageUrl = product.image_front_url || product.image_url || product.image_front_small_url || null;

      let storesToCreate: string[];
      
      if (identifiedStore) {
        // Create variant for identified store
        storesToCreate = [identifiedStore];
      } else {
        // Create variants for multiple common stores
        // This gives users options when selecting the product
        storesToCreate = [
          "Loblaws",
          "Metro",
          "Sobeys",
          "Real Canadian Superstore",
          "No Frills",
          "Walmart",
        ];
      }

      // Get or create stores
      const stores = await getOrCreateStores(storesToCreate);

      // Create ProductVariant for the first store (primary variant with barcode)
      // Other stores will be available as variants without barcode
      const primaryStore = stores[0];
      
      const newVariant = await prisma.productVariant.create({
        data: {
          groceryItemId,
          storeId: primaryStore.id,
          name: productName,
          imageUrl,
          barcode,
        },
      });

      variantId = newVariant.id;

      // Create variants for other stores asynchronously (don't wait for this)
      // This allows users to select the product from different stores
      // We do this in the background so the API responds faster
      if (stores.length > 1) {
        // Fire and forget - create other variants in background
        Promise.all(
          stores.slice(1).map(async (store) => {
            try {
              await prisma.productVariant.create({
                data: {
                  groceryItemId,
                  storeId: store.id,
                  name: productName,
                  imageUrl,
                  // No barcode for additional variants (barcode is unique)
                },
              });
            } catch (error: unknown) {
              // Variant might already exist (unique constraint), skip silently
              const prismaError = error as { code?: string; message?: string };
              if (!prismaError.message?.includes("Unique constraint") && !prismaError.code?.includes("P2002")) {
                console.error(`Error creating variant for store ${store.name}:`, prismaError.message);
              }
            }
          })
        ).catch((err) => {
          // Log but don't fail the request
          console.error("Error creating additional variants in background:", err);
        });
      }
    }

    // Get current list and add item
    const list = await resolveCurrentList();
    if (!list) {
      return NextResponse.json(
        {
          success: false,
          error: "No list found. Please log in or enter a PIN.",
          code: "NO_IDENTITY",
        },
        { status: 401 }
      );
    }

    // Always ensure item is added (never removes - scanning should always add items)
    console.log(`[Barcode Scan] Adding item to list: ${productName} (groceryItemId: ${groceryItemId}, variantId: ${variantId})`);
    const result = await ensureListItem(list.id, groceryItemId, variantId);
    console.log(`[Barcode Scan] Successfully added item to list: ${productName} (active: ${result.active})`);

    // Also add to MyList if anonVisitorId is provided (for /list page users)
    console.log(`[Barcode Scan] Checking for anonVisitorId: ${anonVisitorId ? "present" : "missing"}`);
    if (anonVisitorId && typeof anonVisitorId === "string") {
      try {
        console.log(`[Barcode Scan] Adding to MyList with anonVisitorId: ${anonVisitorId.substring(0, 8)}...`);
        // Find or create visitor
        const visitor = await prisma.visitor.upsert({
          where: { anonVisitorId },
          create: { anonVisitorId },
          update: { lastSeenAt: new Date() },
        });
        console.log(`[Barcode Scan] Visitor found/created: ${visitor.id}`);

        // Find or create MyList for this visitor
        let myList = await prisma.myList.findFirst({
          where: { ownerVisitorId: visitor.id },
        });

        if (!myList) {
          myList = await prisma.myList.create({
            data: {
              ownerVisitorId: visitor.id,
            },
          });
          console.log(`[Barcode Scan] Created new MyList: ${myList.id}`);
        } else {
          console.log(`[Barcode Scan] Found existing MyList: ${myList.id}`);
        }

        // Add item to MyList using product name as itemLabel
        const itemKey = productName.trim().toLowerCase().replace(/\s+/g, "-");
        console.log(`[Barcode Scan] Upserting MyListItem with itemKey: ${itemKey}`);
        const myListItem = await prisma.myListItem.upsert({
          where: {
            listId_itemKey: {
              listId: myList.id,
              itemKey,
            },
          },
          create: {
            listId: myList.id,
            itemKey,
            itemLabel: productName.trim(),
            quantity: 1,
            lastAddedAt: new Date(),
          },
          update: {
            lastAddedAt: new Date(),
            quantity: { increment: 1 },
            purchasedAt: null, // un-purchase if re-added
          },
        });
        console.log(`[Barcode Scan] Successfully added item to MyList: ${productName} (itemId: ${myListItem.id})`);
      } catch (myListError) {
        // Log but don't fail the request if MyList add fails
        console.error("[Barcode Scan] Failed to add to MyList:", {
          error: myListError,
          anonVisitorId: anonVisitorId?.substring(0, 8),
          productName,
        });
      }
    } else {
      console.log(`[Barcode Scan] Skipping MyList addition - anonVisitorId not provided or invalid`);
    }

    return NextResponse.json({
      success: true,
      data: {
        groceryItemId,
        productVariantId: variantId,
        active: result.active,
        productName,
      },
    });
  } catch (error) {
    const errorDetails = error as { code?: string; message?: string; name?: string };
    console.error("[Barcode Scan] Error scanning barcode:", {
      barcode: barcode || "unknown",
      errorCode: errorDetails?.code,
      errorMessage: errorDetails?.message,
      errorName: errorDetails?.name,
      error,
    });
    return NextResponse.json(
      { success: false, error: "Failed to process barcode scan", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
