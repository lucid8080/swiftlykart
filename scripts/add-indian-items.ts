import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Indian food items organized by category
// Items that already exist (like "Chicken", "Tomatoes") will be skipped
const indianItems: Record<string, Array<{ name: string; icon: string }>> = {
  "Produce": [
    { name: "Red Onions", icon: "🧅" },
    { name: "Ginger", icon: "🫚" },
    { name: "Green Chilies", icon: "🌶️" },
    { name: "Fresh Cilantro", icon: "🌿" },
    { name: "Curry Leaves", icon: "🌿" },
    { name: "Cauliflower", icon: "🥦" },
    { name: "Eggplant (Brinjal)", icon: "🍆" },
    { name: "Okra (Bhindi)", icon: "🥒" },
  ],
  "Pantry": [
    { name: "Basmati Rice", icon: "🍚" },
    { name: "Atta (Whole Wheat Flour)", icon: "🌾" },
    { name: "Red Lentils (Masoor Dal)", icon: "🥣" },
    { name: "Yellow Lentils (Toor Dal)", icon: "🥣" },
    { name: "Chickpeas (Chana)", icon: "🫘" },
    { name: "Kidney Beans (Rajma)", icon: "🫘" },
    { name: "Coconut Milk", icon: "🥥" },
    { name: "Jaggery (or Brown Sugar)", icon: "🍯" },
    { name: "Tamarind Paste", icon: "🥄" },
  ],
  "Spices": [
    { name: "Turmeric Powder", icon: "🟡" },
    { name: "Cumin Seeds", icon: "🌰" },
    { name: "Coriander Powder", icon: "🌿" },
    { name: "Red Chili Powder", icon: "🔥" },
    { name: "Garam Masala", icon: "🌿" },
    { name: "Mustard Seeds", icon: "🌱" },
    { name: "Fenugreek Seeds", icon: "🌿" },
    { name: "Cardamom", icon: "🌰" },
    { name: "Cloves", icon: "🌰" },
    { name: "Cinnamon Sticks", icon: "🌰" },
    { name: "Bay Leaves", icon: "🍃" },
  ],
  "Dairy": [
    { name: "Paneer", icon: "🧀" },
    { name: "Yogurt (Plain / Dahi)", icon: "🥛" },
    { name: "Ghee", icon: "🧈" },
  ],
  "Meat": [
    { name: "Lamb / Goat", icon: "🥩" },
    { name: "Fish", icon: "🐟" },
  ],
  "Bakery": [
    { name: "Butter Naan", icon: "🫓" },
    { name: "Garlic Naan", icon: "🫓" },
    { name: "Tandoori Roti", icon: "🫓" },
    { name: "Chapati", icon: "🫓" },
    { name: "Paratha", icon: "🫓" },
    { name: "Aloo Paratha", icon: "🫓" },
    { name: "Lachha Paratha", icon: "🫓" },
    { name: "Missi Roti", icon: "🫓" },
    { name: "Kulcha", icon: "🫓" },
    { name: "Bhatura", icon: "🫓" },
    { name: "Puri", icon: "🫓" },
  ],
};

async function main() {
  console.log("🇮🇳 Adding Indian food items to database...\n");

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalUpdated = 0;

  for (const [categoryName, items] of Object.entries(indianItems)) {
    // Find or create the category
    let category = await prisma.category.findUnique({
      where: { name: categoryName },
      include: {
        items: {
          orderBy: { sortOrder: "desc" },
          take: 1,
        },
      },
    });

    // Create category if it doesn't exist (for "Bakery" or "Spices")
    if (!category) {
      // Get the highest sortOrder across all categories
      const maxCategory = await prisma.category.findFirst({
        orderBy: { sortOrder: "desc" },
      });
      const newSortOrder = maxCategory ? maxCategory.sortOrder + 1 : 100;

      category = await prisma.category.create({
        data: {
          name: categoryName,
          sortOrder: newSortOrder,
        },
        include: {
          items: [],
        },
      });
      console.log(`📁 Created category: ${categoryName}`);
    }

    // Get the highest sortOrder in this category
    const maxSortOrder = category.items.length > 0 
      ? category.items[0].sortOrder 
      : 0;

    console.log(`\n📁 Processing category: ${categoryName}`);
    console.log(`   Current max sortOrder: ${maxSortOrder}`);

    let categoryCreated = 0;
    let categorySkipped = 0;
    let categoryUpdated = 0;

    for (let i = 0; i < items.length; i++) {
      const itemData = items[i];
      const sortOrder = maxSortOrder + i + 1;

      // Check if item already exists in this category
      const existingItem = await prisma.groceryItem.findUnique({
        where: {
          name_categoryId: {
            name: itemData.name,
            categoryId: category.id,
          },
        },
      });

      if (existingItem) {
        // Item exists - update cuisine if not set, but don't change other properties
        if (existingItem.cuisine !== "indian") {
          await prisma.groceryItem.update({
            where: { id: existingItem.id },
            data: { 
              cuisine: "indian",
            },
          });
          console.log(`   🔄 Updated cuisine for existing item: ${itemData.name} ${itemData.icon}`);
          categoryUpdated++;
        } else {
          console.log(`   ⏭️  Skipped (already exists with Indian cuisine): ${itemData.name}`);
          categorySkipped++;
        }
      } else {
        // Create new item with Indian cuisine
        await prisma.groceryItem.create({
          data: {
            name: itemData.name,
            icon: itemData.icon,
            sortOrder: sortOrder,
            categoryId: category.id,
            cuisine: "indian",
            isActive: true,
          },
        });
        console.log(`   ✅ Created: ${itemData.name} ${itemData.icon} (Indian)`);
        categoryCreated++;
      }
    }

    totalCreated += categoryCreated;
    totalSkipped += categorySkipped;
    totalUpdated += categoryUpdated;
    console.log(`   Summary: ${categoryCreated} created, ${categoryUpdated} updated, ${categorySkipped} skipped`);
  }

  console.log("\n✅ Add Indian items completed!");
  console.log(`   📦 Total items created: ${totalCreated}`);
  console.log(`   🔄 Total items updated: ${totalUpdated}`);
  console.log(`   ⏭️  Total items skipped: ${totalSkipped}`);

  // Final database stats
  const indianItemsCount = await prisma.groceryItem.count({
    where: { 
      cuisine: "indian",
      isActive: true,
    },
  });
  const activeCount = await prisma.groceryItem.count({
    where: { isActive: true },
  });
  const totalCount = await prisma.groceryItem.count();
  console.log(`   📊 Database stats: ${activeCount}/${totalCount} items active`);
  console.log(`   🇮🇳 Indian cuisine items: ${indianItemsCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Add Indian items failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
