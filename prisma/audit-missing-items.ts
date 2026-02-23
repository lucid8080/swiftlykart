import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Comprehensive list of common grocery items that should be available
const commonItems: Record<string, Array<{ name: string; icon: string }>> = {
  "Meat": [
    { name: "Chicken Breast", icon: "🍗" },
    { name: "Chicken Thighs", icon: "🍗" },
    { name: "Ground Beef", icon: "🥩" },
    { name: "Steak", icon: "🥩" },
    { name: "Pork Chops", icon: "🥩" },
    { name: "Bacon", icon: "🥓" },
    { name: "Sausage", icon: "🌭" },
    { name: "Ground Turkey", icon: "🦃" },
    { name: "Ham", icon: "🍖" },
    { name: "Hot Dogs", icon: "🌭" },
    { name: "Deli Turkey", icon: "🦃" },
    { name: "Deli Ham", icon: "🍖" },
    // Seafood items
    { name: "Salmon", icon: "🐟" },
    { name: "Shrimp", icon: "🦐" },
    { name: "Tuna", icon: "🐟" },
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
    { name: "Apples", icon: "🍎" },
    { name: "Bananas", icon: "🍌" },
    { name: "Oranges", icon: "🍊" },
    { name: "Lemons", icon: "🍋" },
    { name: "Limes", icon: "🍋" },
    { name: "Grapes", icon: "🍇" },
    { name: "Strawberries", icon: "🍓" },
    { name: "Blueberries", icon: "🫐" },
    { name: "Raspberries", icon: "🫐" },
    { name: "Watermelon", icon: "🍉" },
    { name: "Cantaloupe", icon: "🍈" },
    { name: "Pineapple", icon: "🍍" },
    { name: "Mango", icon: "🥭" },
    { name: "Avocado", icon: "🥑" },
    { name: "Tomatoes", icon: "🍅" },
    { name: "Cucumbers", icon: "🥒" },
    { name: "Carrots", icon: "🥕" },
    { name: "Broccoli", icon: "🥦" },
    { name: "Lettuce", icon: "🥬" },
    { name: "Spinach", icon: "🥬" },
    { name: "Kale", icon: "🥬" },
    { name: "Bell Peppers", icon: "🫑" },
    { name: "Onions", icon: "🧅" },
    { name: "Garlic", icon: "🧄" },
    { name: "Potatoes", icon: "🥔" },
    { name: "Sweet Potatoes", icon: "🍠" },
    { name: "Mushrooms", icon: "🍄" },
    { name: "Corn", icon: "🌽" },
    { name: "Celery", icon: "🥬" },
    { name: "Green Beans", icon: "🫛" },
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
    { name: "Milk", icon: "🥛" },
    { name: "Goat Milk", icon: "🥛" },
    { name: "Almond Milk", icon: "🥛" },
    { name: "Oat Milk", icon: "🥛" },
    { name: "Heavy Cream", icon: "🥛" },
    { name: "Half & Half", icon: "🥛" },
    { name: "Butter", icon: "🧈" },
    { name: "Eggs", icon: "🥚" },
    { name: "Cheddar Cheese", icon: "🧀" },
    { name: "Mozzarella", icon: "🧀" },
    { name: "Parmesan", icon: "🧀" },
    { name: "Cream Cheese", icon: "🧀" },
    { name: "Greek Yogurt", icon: "🥛" },
    { name: "Sour Cream", icon: "🥛" },
    { name: "Cottage Cheese", icon: "🥛" },
    { name: "Swiss Cheese", icon: "🧀" },
    { name: "Feta Cheese", icon: "🧀" },
    { name: "Goat Cheese", icon: "🧀" },
    { name: "Ricotta", icon: "🧀" },
    { name: "Brie", icon: "🧀" },
  ],
};

async function main() {
  console.log("🔍 Auditing missing items from comprehensive list...\n");

  // Get all categories and items from database
  const dbCategories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  console.log("📊 Missing Items Report:\n");

  let totalMissing = 0;

  for (const [categoryName, expectedItems] of Object.entries(commonItems)) {
    const dbCategory = dbCategories.find((c) => c.name === categoryName);

    if (!dbCategory) {
      console.log(`❌ Category "${categoryName}" NOT FOUND in database\n`);
      continue;
    }

    const dbItemNames = new Set(
      dbCategory.items.map((item) => item.name.toLowerCase())
    );
    const missing = expectedItems.filter(
      (item) => !dbItemNames.has(item.name.toLowerCase())
    );

    if (missing.length > 0) {
      totalMissing += missing.length;
      console.log(`📁 ${categoryName}:`);
      console.log(`   ❌ Missing ${missing.length} item(s):`);
      missing.forEach((item) => {
        console.log(`      - ${item.name} ${item.icon}`);
      });
      console.log("");
    } else {
      console.log(`✅ ${categoryName}: All items present\n`);
    }
  }

  console.log(`\n📈 Summary: ${totalMissing} total missing items`);

  if (totalMissing > 0) {
    console.log("\n💡 Tip: Use the fill-missing-items script or add these manually in the admin panel.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Audit failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
