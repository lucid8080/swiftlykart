import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CategoryData {
  name: string;
  sortOrder: number;
  items: Array<{ name: string; icon: string; sortOrder: number }>;
}

const categories: CategoryData[] = [
  {
    name: "Produce",
    sortOrder: 1,
    items: [
      { name: "Apples", icon: "🍎", sortOrder: 1 },
      { name: "Bananas", icon: "🍌", sortOrder: 2 },
      { name: "Oranges", icon: "🍊", sortOrder: 3 },
      { name: "Lemons", icon: "🍋", sortOrder: 4 },
      { name: "Limes", icon: "🍋", sortOrder: 5 },
      { name: "Grapes", icon: "🍇", sortOrder: 6 },
      { name: "Strawberries", icon: "🍓", sortOrder: 7 },
      { name: "Blueberries", icon: "🫐", sortOrder: 8 },
      { name: "Raspberries", icon: "🫐", sortOrder: 9 },
      { name: "Watermelon", icon: "🍉", sortOrder: 10 },
      { name: "Cantaloupe", icon: "🍈", sortOrder: 11 },
      { name: "Pineapple", icon: "🍍", sortOrder: 12 },
      { name: "Mango", icon: "🥭", sortOrder: 13 },
      { name: "Avocado", icon: "🥑", sortOrder: 14 },
      { name: "Tomatoes", icon: "🍅", sortOrder: 15 },
      { name: "Cucumbers", icon: "🥒", sortOrder: 16 },
      { name: "Carrots", icon: "🥕", sortOrder: 17 },
      { name: "Broccoli", icon: "🥦", sortOrder: 18 },
      { name: "Lettuce", icon: "🥬", sortOrder: 19 },
      { name: "Spinach", icon: "🥬", sortOrder: 20 },
      { name: "Kale", icon: "🥬", sortOrder: 21 },
      { name: "Bell Peppers", icon: "🫑", sortOrder: 22 },
      { name: "Onions", icon: "🧅", sortOrder: 23 },
      { name: "Garlic", icon: "🧄", sortOrder: 24 },
      { name: "Potatoes", icon: "🥔", sortOrder: 25 },
      { name: "Sweet Potatoes", icon: "🍠", sortOrder: 26 },
      { name: "Mushrooms", icon: "🍄", sortOrder: 27 },
      { name: "Corn", icon: "🌽", sortOrder: 28 },
      { name: "Celery", icon: "🥬", sortOrder: 29 },
      { name: "Green Beans", icon: "🫛", sortOrder: 30 },
    ],
  },
  {
    name: "Dairy",
    sortOrder: 2,
    items: [
      { name: "Milk", icon: "🥛", sortOrder: 1 },
      { name: "Goat Milk", icon: "🥛", sortOrder: 2 },
      { name: "Almond Milk", icon: "🥛", sortOrder: 3 },
      { name: "Oat Milk", icon: "🥛", sortOrder: 4 },
      { name: "Heavy Cream", icon: "🥛", sortOrder: 5 },
      { name: "Half & Half", icon: "🥛", sortOrder: 6 },
      { name: "Butter", icon: "🧈", sortOrder: 7 },
      { name: "Eggs", icon: "🥚", sortOrder: 8 },
      { name: "Cheddar Cheese", icon: "🧀", sortOrder: 9 },
      { name: "Mozzarella", icon: "🧀", sortOrder: 10 },
      { name: "Parmesan", icon: "🧀", sortOrder: 11 },
      { name: "Cream Cheese", icon: "🧀", sortOrder: 12 },
      { name: "Greek Yogurt", icon: "🥛", sortOrder: 13 },
      { name: "Sour Cream", icon: "🥛", sortOrder: 14 },
      { name: "Cottage Cheese", icon: "🥛", sortOrder: 15 },
    ],
  },
  {
    name: "Meat",
    sortOrder: 3,
    items: [
      { name: "Chicken Breast", icon: "🍗", sortOrder: 1 },
      { name: "Chicken Thighs", icon: "🍗", sortOrder: 2 },
      { name: "Ground Beef", icon: "🥩", sortOrder: 3 },
      { name: "Steak", icon: "🥩", sortOrder: 4 },
      { name: "Pork Chops", icon: "🥩", sortOrder: 5 },
      { name: "Bacon", icon: "🥓", sortOrder: 6 },
      { name: "Sausage", icon: "🌭", sortOrder: 7 },
      { name: "Ground Turkey", icon: "🦃", sortOrder: 8 },
      { name: "Ham", icon: "🍖", sortOrder: 9 },
      { name: "Hot Dogs", icon: "🌭", sortOrder: 10 },
      { name: "Deli Turkey", icon: "🦃", sortOrder: 11 },
      { name: "Deli Ham", icon: "🍖", sortOrder: 12 },
      { name: "Salmon", icon: "🐟", sortOrder: 13 },
      { name: "Shrimp", icon: "🦐", sortOrder: 14 },
      { name: "Tuna", icon: "🐟", sortOrder: 15 },
    ],
  },
  {
    name: "Pantry",
    sortOrder: 4,
    items: [
      { name: "Rice", icon: "🍚", sortOrder: 1 },
      { name: "Pasta", icon: "🍝", sortOrder: 2 },
      { name: "Bread", icon: "🍞", sortOrder: 3 },
      { name: "Tortillas", icon: "🫓", sortOrder: 4 },
      { name: "Flour", icon: "🌾", sortOrder: 5 },
      { name: "Sugar", icon: "🍬", sortOrder: 6 },
      { name: "Brown Sugar", icon: "🍬", sortOrder: 7 },
      { name: "Olive Oil", icon: "🫒", sortOrder: 8 },
      { name: "Vegetable Oil", icon: "🛢️", sortOrder: 9 },
      { name: "Salt", icon: "🧂", sortOrder: 10 },
      { name: "Pepper", icon: "🌶️", sortOrder: 11 },
      { name: "Canned Tomatoes", icon: "🥫", sortOrder: 12 },
      { name: "Tomato Sauce", icon: "🥫", sortOrder: 13 },
      { name: "Chicken Broth", icon: "🥫", sortOrder: 14 },
      { name: "Beans (Black)", icon: "🫘", sortOrder: 15 },
      { name: "Beans (Kidney)", icon: "🫘", sortOrder: 16 },
      { name: "Beans (Pinto)", icon: "🫘", sortOrder: 17 },
      { name: "Peanut Butter", icon: "🥜", sortOrder: 18 },
      { name: "Jelly/Jam", icon: "🍯", sortOrder: 19 },
      { name: "Honey", icon: "🍯", sortOrder: 20 },
      { name: "Maple Syrup", icon: "🥞", sortOrder: 21 },
      { name: "Cereal", icon: "🥣", sortOrder: 22 },
      { name: "Oatmeal", icon: "🥣", sortOrder: 23 },
      { name: "Pancake Mix", icon: "🥞", sortOrder: 24 },
    ],
  },
  {
    name: "Frozen",
    sortOrder: 5,
    items: [
      { name: "Frozen Pizza", icon: "🍕", sortOrder: 1 },
      { name: "Ice Cream", icon: "🍦", sortOrder: 2 },
      { name: "Frozen Vegetables", icon: "🥦", sortOrder: 3 },
      { name: "Frozen Fruit", icon: "🍓", sortOrder: 4 },
      { name: "Frozen Chicken", icon: "🍗", sortOrder: 5 },
      { name: "Frozen Fish", icon: "🐟", sortOrder: 6 },
      { name: "Frozen Waffles", icon: "🧇", sortOrder: 7 },
      { name: "Frozen Burritos", icon: "🌯", sortOrder: 8 },
      { name: "French Fries", icon: "🍟", sortOrder: 9 },
      { name: "Tater Tots", icon: "🥔", sortOrder: 10 },
      { name: "Frozen Meals", icon: "🍱", sortOrder: 11 },
      { name: "Popsicles", icon: "🧊", sortOrder: 12 },
    ],
  },
  {
    name: "Snacks",
    sortOrder: 6,
    items: [
      { name: "Chips", icon: "🥔", sortOrder: 1 },
      { name: "Pretzels", icon: "🥨", sortOrder: 2 },
      { name: "Popcorn", icon: "🍿", sortOrder: 3 },
      { name: "Crackers", icon: "🍘", sortOrder: 4 },
      { name: "Cookies", icon: "🍪", sortOrder: 5 },
      { name: "Granola Bars", icon: "🍫", sortOrder: 6 },
      { name: "Trail Mix", icon: "🥜", sortOrder: 7 },
      { name: "Nuts (Almonds)", icon: "🥜", sortOrder: 8 },
      { name: "Nuts (Cashews)", icon: "🥜", sortOrder: 9 },
      { name: "Dried Fruit", icon: "🍇", sortOrder: 10 },
      { name: "Candy", icon: "🍬", sortOrder: 11 },
      { name: "Chocolate", icon: "🍫", sortOrder: 12 },
      { name: "Fruit Snacks", icon: "🍓", sortOrder: 13 },
      { name: "Beef Jerky", icon: "🥩", sortOrder: 14 },
    ],
  },
  {
    name: "Drinks",
    sortOrder: 7,
    items: [
      { name: "Water (Bottled)", icon: "💧", sortOrder: 1 },
      { name: "Sparkling Water", icon: "💧", sortOrder: 2 },
      { name: "Orange Juice", icon: "🍊", sortOrder: 3 },
      { name: "Apple Juice", icon: "🍎", sortOrder: 4 },
      { name: "Grape Juice", icon: "🍇", sortOrder: 5 },
      { name: "Lemonade", icon: "🍋", sortOrder: 6 },
      { name: "Soda", icon: "🥤", sortOrder: 7 },
      { name: "Coffee", icon: "☕", sortOrder: 8 },
      { name: "Tea", icon: "🍵", sortOrder: 9 },
      { name: "Energy Drinks", icon: "⚡", sortOrder: 10 },
      { name: "Sports Drinks", icon: "🏃", sortOrder: 11 },
      { name: "Beer", icon: "🍺", sortOrder: 12 },
      { name: "Wine", icon: "🍷", sortOrder: 13 },
    ],
  },
  {
    name: "Household",
    sortOrder: 8,
    items: [
      { name: "Paper Towels", icon: "🧻", sortOrder: 1 },
      { name: "Toilet Paper", icon: "🧻", sortOrder: 2 },
      { name: "Tissues", icon: "🧻", sortOrder: 3 },
      { name: "Dish Soap", icon: "🧴", sortOrder: 4 },
      { name: "Laundry Detergent", icon: "🧺", sortOrder: 5 },
      { name: "Hand Soap", icon: "🧴", sortOrder: 6 },
      { name: "Shampoo", icon: "🧴", sortOrder: 7 },
      { name: "Conditioner", icon: "🧴", sortOrder: 8 },
      { name: "Body Wash", icon: "🧴", sortOrder: 9 },
      { name: "Toothpaste", icon: "🪥", sortOrder: 10 },
      { name: "Deodorant", icon: "🧴", sortOrder: 11 },
      { name: "Trash Bags", icon: "🗑️", sortOrder: 12 },
      { name: "Aluminum Foil", icon: "📦", sortOrder: 13 },
      { name: "Plastic Wrap", icon: "📦", sortOrder: 14 },
      { name: "Ziplock Bags", icon: "📦", sortOrder: 15 },
      { name: "Sponges", icon: "🧽", sortOrder: 16 },
      { name: "All-Purpose Cleaner", icon: "🧹", sortOrder: 17 },
      { name: "Glass Cleaner", icon: "🪟", sortOrder: 18 },
      { name: "Bleach", icon: "🧪", sortOrder: 19 },
      { name: "Light Bulbs", icon: "💡", sortOrder: 20 },
      { name: "Batteries", icon: "🔋", sortOrder: 21 },
    ],
  },
];

async function main() {
  console.log("🔍 Checking database items...\n");
  
  // Get all categories from database
  const dbCategories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  
  console.log("📊 Database Summary:");
  console.log(`   Categories: ${dbCategories.length}`);
  console.log(`   Total Items: ${dbCategories.reduce((sum, cat) => sum + cat.items.length, 0)}`);
  console.log(`   Active Items: ${dbCategories.reduce((sum, cat) => sum + cat.items.filter(i => i.isActive).length, 0)}`);
  console.log(`   Inactive Items: ${dbCategories.reduce((sum, cat) => sum + cat.items.filter(i => !i.isActive).length, 0)}`);
  
  console.log("\n📋 Category Breakdown:\n");
  
  for (const categoryData of categories) {
    const dbCategory = dbCategories.find(c => c.name === categoryData.name);
    
    if (!dbCategory) {
      console.log(`❌ Category "${categoryData.name}" NOT FOUND in database`);
      continue;
    }
    
    const dbItems = dbCategory.items;
    const activeItems = dbItems.filter(i => i.isActive);
    const seedItemNames = new Set(categoryData.items.map(i => i.name));
    const dbItemNames = new Set(dbItems.map(i => i.name));
    
    const missing = categoryData.items.filter(item => !dbItemNames.has(item.name));
    const extra = dbItems.filter(item => !seedItemNames.has(item.name));
    const inactive = dbItems.filter(item => !item.isActive && seedItemNames.has(item.name));
    
    console.log(`📁 ${categoryData.name}:`);
    console.log(`   Expected: ${categoryData.items.length} items`);
    console.log(`   In DB: ${dbItems.length} items (${activeItems.length} active, ${dbItems.length - activeItems.length} inactive)`);
    
    if (missing.length > 0) {
      console.log(`   ❌ Missing items (${missing.length}):`);
      missing.forEach(item => console.log(`      - ${item.name}`));
    }
    
    if (inactive.length > 0) {
      console.log(`   ⚠️  Inactive items (${inactive.length}):`);
      inactive.forEach(item => console.log(`      - ${item.name}`));
    }
    
    if (extra.length > 0) {
      console.log(`   ℹ️  Extra items in DB (${extra.length}):`);
      extra.forEach(item => console.log(`      - ${item.name} (${item.isActive ? 'active' : 'inactive'})`));
    }
    
    if (missing.length === 0 && inactive.length === 0 && extra.length === 0) {
      console.log(`   ✅ All items present and active`);
    }
    
    console.log("");
  }
  
  // Check for items that should be active but aren't
  const allSeedItemNames = new Set(
    categories.flatMap(cat => cat.items.map(item => item.name))
  );
  
  const inactiveSeedItems = await prisma.groceryItem.findMany({
    where: {
      name: {
        in: Array.from(allSeedItemNames),
      },
      isActive: false,
    },
    include: {
      category: {
        select: { name: true },
      },
    },
  });
  
  if (inactiveSeedItems.length > 0) {
    console.log(`\n⚠️  Found ${inactiveSeedItems.length} seed items that are inactive:`);
    inactiveSeedItems.forEach(item => {
      console.log(`   - ${item.name} (${item.category.name})`);
    });
  }
}

main()
  .catch((e) => {
    console.error("❌ Check failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
