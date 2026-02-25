import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Multi-Cuisine Food Items
 * 
 * Adds foods and products for all cuisines in the registry.
 * Items are organized by category and cuisine.
 * Existing items (like generic "Chicken", "Rice") will be skipped.
 */

const multiCuisineItems: Record<string, Array<{ name: string; icon: string; cuisine: string }>> = {
  "Produce": [
    // Chinese
    { name: "Bok Choy", icon: "🥬", cuisine: "chinese" },
    { name: "Napa Cabbage", icon: "🥬", cuisine: "chinese" },
    { name: "Chinese Eggplant", icon: "🍆", cuisine: "chinese" },
    { name: "Snow Peas", icon: "🫛", cuisine: "chinese" },
    { name: "Water Chestnuts", icon: "🌰", cuisine: "chinese" },
    { name: "Bamboo Shoots", icon: "🎋", cuisine: "chinese" },
    
    // Japanese
    { name: "Daikon Radish", icon: "🌶️", cuisine: "japanese" },
    { name: "Shiitake Mushrooms", icon: "🍄", cuisine: "japanese" },
    { name: "Enoki Mushrooms", icon: "🍄", cuisine: "japanese" },
    { name: "Edamame", icon: "🫘", cuisine: "japanese" },
    
    // Thai
    { name: "Thai Basil", icon: "🌿", cuisine: "thai" },
    { name: "Thai Chilies", icon: "🌶️", cuisine: "thai" },
    { name: "Galangal", icon: "🫚", cuisine: "thai" },
    { name: "Kaffir Lime Leaves", icon: "🍃", cuisine: "thai" },
    { name: "Lemongrass", icon: "🌿", cuisine: "thai" },
    
    // Vietnamese
    { name: "Thai Basil", icon: "🌿", cuisine: "vietnamese" },
    { name: "Mint", icon: "🌿", cuisine: "vietnamese" },
    { name: "Bean Sprouts", icon: "🌱", cuisine: "vietnamese" },
    
    // Mediterranean/Middle Eastern
    { name: "Kalamata Olives", icon: "🫒", cuisine: "greek" },
    { name: "Black Olives", icon: "🫒", cuisine: "italian" },
    { name: "Artichokes", icon: "🌿", cuisine: "italian" },
    { name: "Arugula", icon: "🥬", cuisine: "italian" },
    { name: "Pomegranate", icon: "🫐", cuisine: "lebanese" },
  ],

  "Pantry": [
    // Chinese
    { name: "Soy Sauce", icon: "🫙", cuisine: "chinese" },
    { name: "Dark Soy Sauce", icon: "🫙", cuisine: "chinese" },
    { name: "Oyster Sauce", icon: "🫙", cuisine: "chinese" },
    { name: "Hoisin Sauce", icon: "🫙", cuisine: "chinese" },
    { name: "Sesame Oil", icon: "🫙", cuisine: "chinese" },
    { name: "Rice Vinegar", icon: "🫙", cuisine: "chinese" },
    { name: "Shaoxing Wine", icon: "🍶", cuisine: "chinese" },
    { name: "Rice Noodles", icon: "🍜", cuisine: "chinese" },
    { name: "Wonton Wrappers", icon: "🥟", cuisine: "chinese" },
    { name: "Dumpling Wrappers", icon: "🥟", cuisine: "chinese" },
    { name: "Dried Shiitake Mushrooms", icon: "🍄", cuisine: "chinese" },
    { name: "Sichuan Peppercorns", icon: "🌶️", cuisine: "chinese" },
    { name: "Five Spice Powder", icon: "🌿", cuisine: "chinese" },
    { name: "Star Anise", icon: "⭐", cuisine: "chinese" },
    { name: "Dried Black Beans", icon: "🫘", cuisine: "chinese" },
    
    // Japanese
    { name: "Miso Paste", icon: "🫙", cuisine: "japanese" },
    { name: "Sake", icon: "🍶", cuisine: "japanese" },
    { name: "Mirin", icon: "🍶", cuisine: "japanese" },
    { name: "Rice Wine Vinegar", icon: "🫙", cuisine: "japanese" },
    { name: "Kombu (Seaweed)", icon: "🌊", cuisine: "japanese" },
    { name: "Bonito Flakes", icon: "🐟", cuisine: "japanese" },
    { name: "Sushi Rice", icon: "🍚", cuisine: "japanese" },
    { name: "Nori Sheets", icon: "🌊", cuisine: "japanese" },
    { name: "Panko Breadcrumbs", icon: "🍞", cuisine: "japanese" },
    { name: "Wasabi", icon: "🟢", cuisine: "japanese" },
    { name: "Pickled Ginger", icon: "🫚", cuisine: "japanese" },
    
    // Korean
    { name: "Gochujang", icon: "🫙", cuisine: "korean" },
    { name: "Gochugaru (Korean Chili Flakes)", icon: "🌶️", cuisine: "korean" },
    { name: "Doenjang (Soybean Paste)", icon: "🫙", cuisine: "korean" },
    { name: "Kimchi", icon: "🥬", cuisine: "korean" },
    { name: "Sesame Seeds", icon: "🌰", cuisine: "korean" },
    { name: "Rice Cakes (Tteok)", icon: "🍡", cuisine: "korean" },
    
    // Thai
    { name: "Thai Curry Paste (Red)", icon: "🫙", cuisine: "thai" },
    { name: "Thai Curry Paste (Green)", icon: "🫙", cuisine: "thai" },
    { name: "Thai Curry Paste (Yellow)", icon: "🫙", cuisine: "thai" },
    { name: "Fish Sauce", icon: "🫙", cuisine: "thai" },
    { name: "Palm Sugar", icon: "🍯", cuisine: "thai" },
    { name: "Rice Noodles (Pad Thai)", icon: "🍜", cuisine: "thai" },
    { name: "Tamarind Concentrate", icon: "🥄", cuisine: "thai" },
    
    // Vietnamese
    { name: "Rice Paper Wrappers", icon: "📄", cuisine: "vietnamese" },
    { name: "Fish Sauce", icon: "🫙", cuisine: "vietnamese" },
    { name: "Rice Vermicelli", icon: "🍜", cuisine: "vietnamese" },
    
    // Filipino
    { name: "Coconut Vinegar", icon: "🫙", cuisine: "filipino" },
    { name: "Patis (Fish Sauce)", icon: "🫙", cuisine: "filipino" },
    { name: "Banana Ketchup", icon: "🍅", cuisine: "filipino" },
    
    // Italian
    { name: "Extra Virgin Olive Oil", icon: "🫒", cuisine: "italian" },
    { name: "Balsamic Vinegar", icon: "🫙", cuisine: "italian" },
    { name: "Pasta (Various Shapes)", icon: "🍝", cuisine: "italian" },
    { name: "Arborio Rice", icon: "🍚", cuisine: "italian" },
    { name: "Canned Tomatoes", icon: "🍅", cuisine: "italian" },
    { name: "Capers", icon: "🫒", cuisine: "italian" },
    { name: "Anchovies", icon: "🐟", cuisine: "italian" },
    { name: "Sun-Dried Tomatoes", icon: "🍅", cuisine: "italian" },
    
    // French
    { name: "Dijon Mustard", icon: "🫙", cuisine: "french" },
    { name: "Herbes de Provence", icon: "🌿", cuisine: "french" },
    { name: "Truffle Oil", icon: "🫙", cuisine: "french" },
    
    // Greek
    { name: "Kalamata Olives", icon: "🫒", cuisine: "greek" },
    { name: "Phyllo Dough", icon: "🥐", cuisine: "greek" },
    { name: "Tahini", icon: "🫙", cuisine: "greek" },
    
    // Turkish
    { name: "Turkish Delight", icon: "🍬", cuisine: "turkish" },
    { name: "Sumac", icon: "🌿", cuisine: "turkish" },
    { name: "Pomegranate Molasses", icon: "🫙", cuisine: "turkish" },
    
    // Lebanese/Middle Eastern
    { name: "Tahini", icon: "🫙", cuisine: "lebanese" },
    { name: "Pita Bread", icon: "🫓", cuisine: "lebanese" },
    { name: "Sumac", icon: "🌿", cuisine: "lebanese" },
    { name: "Za'atar", icon: "🌿", cuisine: "lebanese" },
    { name: "Pomegranate Molasses", icon: "🫙", cuisine: "lebanese" },
    { name: "Chickpeas (Dried)", icon: "🫘", cuisine: "lebanese" },
    
    // Ethiopian
    { name: "Berbere Spice", icon: "🌶️", cuisine: "ethiopian" },
    { name: "Injera (Teff Flour)", icon: "🌾", cuisine: "ethiopian" },
    { name: "Niter Kibbeh (Spiced Butter)", icon: "🧈", cuisine: "ethiopian" },
    
    // Nigerian
    { name: "Palm Oil", icon: "🫙", cuisine: "nigerian" },
    { name: "Groundnut (Peanut) Oil", icon: "🫙", cuisine: "nigerian" },
    { name: "Egusi Seeds", icon: "🌰", cuisine: "nigerian" },
    
    // Ghanaian
    { name: "Palm Oil", icon: "🫙", cuisine: "ghanaian" },
    { name: "Garden Eggs", icon: "🍆", cuisine: "ghanaian" },
    
    // Jamaican (additional)
    { name: "Scotch Bonnet Peppers", icon: "🌶️", cuisine: "jamaican" },
    { name: "Allspice Berries", icon: "🌰", cuisine: "jamaican" },
    { name: "Ackee", icon: "🥭", cuisine: "jamaican" },
    
    // Haitian
    { name: "Epis (Haitian Seasoning Base)", icon: "🌿", cuisine: "haitian" },
    { name: "Pikliz (Pickled Vegetables)", icon: "🥒", cuisine: "haitian" },
    
    // Mexican (additional)
    { name: "Corn Tortillas", icon: "🫓", cuisine: "mexican" },
    { name: "Flour Tortillas", icon: "🫓", cuisine: "mexican" },
    { name: "Salsa Verde", icon: "🫙", cuisine: "mexican" },
    { name: "Salsa Roja", icon: "🫙", cuisine: "mexican" },
    { name: "Chipotle Peppers", icon: "🌶️", cuisine: "mexican" },
    { name: "Adobo Seasoning", icon: "🌶️", cuisine: "mexican" },
    { name: "Queso Fresco", icon: "🧀", cuisine: "mexican" },
    
    // Brazilian
    { name: "Farofa (Cassava Flour)", icon: "🌾", cuisine: "brazilian" },
    { name: "Açaí", icon: "🫐", cuisine: "brazilian" },
    { name: "Feijão (Black Beans)", icon: "🫘", cuisine: "brazilian" },
    
    // Peruvian
    { name: "Aji Amarillo", icon: "🌶️", cuisine: "peruvian" },
    { name: "Quinoa", icon: "🌾", cuisine: "peruvian" },
    { name: "Purple Corn", icon: "🌽", cuisine: "peruvian" },
    
    // Pakistani
    { name: "Basmati Rice", icon: "🍚", cuisine: "pakistani" },
    { name: "Chana Dal", icon: "🥣", cuisine: "pakistani" },
    
    // Bangladeshi
    { name: "Mustard Oil", icon: "🫙", cuisine: "bangladeshi" },
    { name: "Panch Phoron", icon: "🌿", cuisine: "bangladeshi" },
    
    // Sri Lankan
    { name: "Coconut Oil", icon: "🫙", cuisine: "sri_lankan" },
    { name: "Curry Leaves", icon: "🌿", cuisine: "sri_lankan" },
    { name: "Pandan Leaves", icon: "🍃", cuisine: "sri_lankan" },
  ],

  "Dairy": [
    // Italian
    { name: "Mozzarella di Bufala", icon: "🧀", cuisine: "italian" },
    { name: "Parmigiano Reggiano", icon: "🧀", cuisine: "italian" },
    { name: "Ricotta", icon: "🧀", cuisine: "italian" },
    
    // French
    { name: "Brie", icon: "🧀", cuisine: "french" },
    { name: "Camembert", icon: "🧀", cuisine: "french" },
    { name: "Crème Fraîche", icon: "🥛", cuisine: "french" },
    
    // Greek
    { name: "Feta Cheese", icon: "🧀", cuisine: "greek" },
    { name: "Greek Yogurt", icon: "🥛", cuisine: "greek" },
    
    // Mexican
    { name: "Cotija Cheese", icon: "🧀", cuisine: "mexican" },
    { name: "Crema Mexicana", icon: "🥛", cuisine: "mexican" },
  ],

  "Meat": [
    // Chinese
    { name: "Char Siu (Chinese BBQ Pork)", icon: "🍖", cuisine: "chinese" },
    
    // Japanese
    { name: "Wagyu Beef", icon: "🥩", cuisine: "japanese" },
    
    // Korean
    { name: "Bulgogi Beef", icon: "🥩", cuisine: "korean" },
    { name: "Galbi (Short Ribs)", icon: "🥩", cuisine: "korean" },
    
    // Italian
    { name: "Prosciutto", icon: "🍖", cuisine: "italian" },
    { name: "Pancetta", icon: "🥓", cuisine: "italian" },
    { name: "Italian Sausage", icon: "🌭", cuisine: "italian" },
    
    // Greek
    { name: "Lamb", icon: "🥩", cuisine: "greek" },
    
    // Turkish
    { name: "Lamb", icon: "🥩", cuisine: "turkish" },
    
    // Lebanese
    { name: "Lamb", icon: "🥩", cuisine: "lebanese" },
    
    // Ethiopian
    { name: "Lamb", icon: "🥩", cuisine: "ethiopian" },
    
    // Mexican
    { name: "Carnitas", icon: "🍖", cuisine: "mexican" },
    { name: "Al Pastor", icon: "🍖", cuisine: "mexican" },
    
    // Brazilian
    { name: "Picanha", icon: "🥩", cuisine: "brazilian" },
    
    // Pakistani
    { name: "Lamb", icon: "🥩", cuisine: "pakistani" },
    { name: "Goat", icon: "🥩", cuisine: "pakistani" },
    
    // Bangladeshi
    { name: "Lamb", icon: "🥩", cuisine: "bangladeshi" },
    { name: "Goat", icon: "🥩", cuisine: "bangladeshi" },
  ],

  "Bakery": [
    // Chinese
    { name: "Steamed Buns (Bao)", icon: "🫓", cuisine: "chinese" },
    { name: "Spring Roll Wrappers", icon: "🥟", cuisine: "chinese" },
    
    // Japanese
    { name: "Mochi", icon: "🍡", cuisine: "japanese" },
    
    // Italian
    { name: "Focaccia", icon: "🍞", cuisine: "italian" },
    { name: "Ciabatta", icon: "🍞", cuisine: "italian" },
    { name: "Pizza Dough", icon: "🍕", cuisine: "italian" },
    
    // French
    { name: "Baguette", icon: "🥖", cuisine: "french" },
    { name: "Croissant", icon: "🥐", cuisine: "french" },
    { name: "Brioche", icon: "🍞", cuisine: "french" },
    
    // Greek
    { name: "Pita Bread", icon: "🫓", cuisine: "greek" },
    
    // Turkish
    { name: "Turkish Bread", icon: "🍞", cuisine: "turkish" },
    { name: "Simit", icon: "🥨", cuisine: "turkish" },
    
    // Lebanese
    { name: "Pita Bread", icon: "🫓", cuisine: "lebanese" },
    { name: "Lavash", icon: "🫓", cuisine: "lebanese" },
    
    // Ethiopian
    { name: "Injera", icon: "🫓", cuisine: "ethiopian" },
    
    // Mexican
    { name: "Tortillas (Corn)", icon: "🫓", cuisine: "mexican" },
    { name: "Tortillas (Flour)", icon: "🫓", cuisine: "mexican" },
    
    // Brazilian
    { name: "Pão de Açúcar", icon: "🍞", cuisine: "brazilian" },
    
    // Sri Lankan
    { name: "Hoppers (Appam)", icon: "🫓", cuisine: "sri_lankan" },
    { name: "String Hoppers", icon: "🫓", cuisine: "sri_lankan" },
  ],

  "Spices": [
    // Already added Indian spices, adding others
    { name: "Sichuan Peppercorns", icon: "🌶️", cuisine: "chinese" },
    { name: "Five Spice Powder", icon: "🌿", cuisine: "chinese" },
    { name: "Star Anise", icon: "⭐", cuisine: "chinese" },
    
    { name: "Wasabi Powder", icon: "🟢", cuisine: "japanese" },
    
    { name: "Gochugaru", icon: "🌶️", cuisine: "korean" },
    
    { name: "Thai Basil Seeds", icon: "🌿", cuisine: "thai" },
    
    { name: "Berbere", icon: "🌶️", cuisine: "ethiopian" },
    
    { name: "Za'atar", icon: "🌿", cuisine: "lebanese" },
    { name: "Sumac", icon: "🌿", cuisine: "lebanese" },
    
    { name: "Aji Amarillo", icon: "🌶️", cuisine: "peruvian" },
    
    { name: "Panch Phoron", icon: "🌿", cuisine: "bangladeshi" },
  ],
};

async function main() {
  console.log("🌍 Adding multi-cuisine food items to database...\n");

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalUpdated = 0;

  for (const [categoryName, items] of Object.entries(multiCuisineItems)) {
    // Find the category
    let category = await prisma.category.findUnique({
      where: { name: categoryName },
      include: {
        items: {
          orderBy: { sortOrder: "desc" },
          take: 1,
        },
      },
    });

    // Create category if it doesn't exist
    if (!category) {
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
          items: true,
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
        // Item exists - update cuisine if not set or different
        if (existingItem.cuisine !== itemData.cuisine) {
          await prisma.groceryItem.update({
            where: { id: existingItem.id },
            data: { 
              cuisine: itemData.cuisine,
            },
          });
          console.log(`   🔄 Updated cuisine for: ${itemData.name} ${itemData.icon} → ${itemData.cuisine}`);
          categoryUpdated++;
        } else {
          console.log(`   ⏭️  Skipped (already exists): ${itemData.name}`);
          categorySkipped++;
        }
      } else {
        // Create new item with cuisine
        await prisma.groceryItem.create({
          data: {
            name: itemData.name,
            icon: itemData.icon,
            sortOrder: sortOrder,
            categoryId: category.id,
            cuisine: itemData.cuisine,
            isActive: true,
          },
        });
        console.log(`   ✅ Created: ${itemData.name} ${itemData.icon} (${itemData.cuisine})`);
        categoryCreated++;
      }
    }

    totalCreated += categoryCreated;
    totalSkipped += categorySkipped;
    totalUpdated += categoryUpdated;
    console.log(`   Summary: ${categoryCreated} created, ${categoryUpdated} updated, ${categorySkipped} skipped`);
  }

  console.log("\n✅ Add multi-cuisine items completed!");
  console.log(`   📦 Total items created: ${totalCreated}`);
  console.log(`   🔄 Total items updated: ${totalUpdated}`);
  console.log(`   ⏭️  Total items skipped: ${totalSkipped}`);

  // Final database stats by cuisine
  console.log("\n📊 Items by cuisine:");
  const cuisines = [
    "chinese", "japanese", "korean", "thai", "vietnamese", "filipino",
    "italian", "french", "greek", "turkish", "lebanese",
    "ethiopian", "nigerian", "ghanaian",
    "jamaican", "haitian", "mexican", "brazilian", "peruvian",
    "pakistani", "bangladeshi", "sri_lankan",
  ];
  
  for (const cuisine of cuisines) {
    const count = await prisma.groceryItem.count({
      where: { 
        cuisine: cuisine,
        isActive: true,
      },
    });
    if (count > 0) {
      console.log(`   ${cuisine}: ${count} items`);
    }
  }

  const activeCount = await prisma.groceryItem.count({
    where: { isActive: true },
  });
  const totalCount = await prisma.groceryItem.count();
  console.log(`\n   📊 Database stats: ${activeCount}/${totalCount} items active`);
}

main()
  .catch((e) => {
    console.error("❌ Add multi-cuisine items failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
