import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Missing items to add, organized by category
const missingItems: Record<string, Array<{ name: string; icon: string }>> = {
  "Meat": [
    { name: "Scallops", icon: "🦪" },
    { name: "Cod", icon: "🐟" },
    { name: "Tilapia", icon: "🐟" },
    { name: "Halibut", icon: "🐟" },
    { name: "Lobster", icon: "🦞" },
    { name: "Crab", icon: "🦀" },
    { name: "Mussels", icon: "🦪" },
    { name: "Clams", icon: "🦪" },
    { name: "Oysters", icon: "🦪" },
    { name: "Sardines", icon: "🐟" },
    { name: "Anchovies", icon: "🐟" },
    { name: "Mahi Mahi", icon: "🐟" },
    { name: "Sea Bass", icon: "🐟" },
    { name: "Trout", icon: "🐟" },
    { name: "Catfish", icon: "🐟" },
  ],
  "Produce": [
    { name: "Zucchini", icon: "🥒" },
    { name: "Eggplant", icon: "🍆" },
    { name: "Asparagus", icon: "🌱" },
    { name: "Cauliflower", icon: "🥦" },
    { name: "Brussels Sprouts", icon: "🥬" },
    { name: "Cabbage", icon: "🥬" },
    { name: "Radishes", icon: "🌶️" },
    { name: "Peas", icon: "🫛" },
    { name: "Artichokes", icon: "🌿" },
  ],
  "Dairy": [
    { name: "Swiss Cheese", icon: "🧀" },
    { name: "Feta Cheese", icon: "🧀" },
    { name: "Goat Cheese", icon: "🧀" },
    { name: "Ricotta", icon: "🧀" },
    { name: "Brie", icon: "🧀" },
  ],
};

async function main() {
  console.log("🔍 Adding missing items to database...\n");

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const [categoryName, items] of Object.entries(missingItems)) {
    // Find the category
    const category = await prisma.category.findUnique({
      where: { name: categoryName },
      include: {
        items: {
          orderBy: { sortOrder: "desc" },
          take: 1, // Get the item with highest sortOrder
        },
      },
    });

    if (!category) {
      console.log(`❌ Category "${categoryName}" not found. Skipping...\n`);
      continue;
    }

    // Get the highest sortOrder in this category
    const maxSortOrder = category.items.length > 0 
      ? category.items[0].sortOrder 
      : 0;

    console.log(`📁 Processing category: ${categoryName}`);
    console.log(`   Current max sortOrder: ${maxSortOrder}`);

    let categoryCreated = 0;
    let categorySkipped = 0;

    for (let i = 0; i < items.length; i++) {
      const itemData = items[i];
      const sortOrder = maxSortOrder + i + 1;

      // Check if item already exists
      const existingItem = await prisma.groceryItem.findUnique({
        where: {
          name_categoryId: {
            name: itemData.name,
            categoryId: category.id,
          },
        },
      });

      if (existingItem) {
        // Item exists, check if it's inactive
        if (!existingItem.isActive) {
          await prisma.groceryItem.update({
            where: { id: existingItem.id },
            data: { 
              isActive: true,
              icon: itemData.icon,
              sortOrder: sortOrder,
            },
          });
          console.log(`   ✅ Activated existing item: ${itemData.name} ${itemData.icon}`);
          categoryCreated++;
        } else {
          console.log(`   ⏭️  Skipped (already exists): ${itemData.name}`);
          categorySkipped++;
        }
      } else {
        // Create new item
        await prisma.groceryItem.create({
          data: {
            name: itemData.name,
            icon: itemData.icon,
            sortOrder: sortOrder,
            categoryId: category.id,
            isActive: true,
          },
        });
        console.log(`   ✅ Created: ${itemData.name} ${itemData.icon}`);
        categoryCreated++;
      }
    }

    totalCreated += categoryCreated;
    totalSkipped += categorySkipped;
    console.log(`   Summary: ${categoryCreated} added, ${categorySkipped} skipped\n`);
  }

  console.log("✅ Add missing items completed!");
  console.log(`   📦 Total items added/activated: ${totalCreated}`);
  console.log(`   ⏭️  Total items skipped: ${totalSkipped}`);

  // Final database stats
  const activeCount = await prisma.groceryItem.count({
    where: { isActive: true },
  });
  const totalCount = await prisma.groceryItem.count();
  console.log(`   📊 Database stats: ${activeCount}/${totalCount} items active`);
}

main()
  .catch((e) => {
    console.error("❌ Add missing items failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
