import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

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

// Product variant data structure
interface ProductVariantData {
  store: string;
  name: string;
  price: number | null; // null means no price info
}

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data
  console.log("🗑️ Clearing existing data...");
  await prisma.listItem.deleteMany();
  await prisma.list.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.store.deleteMany();
  await prisma.groceryItem.deleteMany();
  await prisma.category.deleteMany();

  // Create categories and items
  console.log("📦 Creating categories and items...");
  
  let totalItems = 0;
  const groceryItemsMap = new Map<string, { id: string; name: string }>();
  
  for (const categoryData of categories) {
    const category = await prisma.category.create({
      data: {
        name: categoryData.name,
        sortOrder: categoryData.sortOrder,
      },
    });

    console.log(`  📁 Created category: ${category.name}`);

    for (const itemData of categoryData.items) {
      const item = await prisma.groceryItem.create({
        data: {
          name: itemData.name,
          icon: itemData.icon,
          sortOrder: itemData.sortOrder,
          categoryId: category.id,
          isActive: true,
        },
      });
      groceryItemsMap.set(itemData.name, { id: item.id, name: item.name });
      totalItems++;
    }
  }

  // Create Canadian stores
  console.log("");
  console.log("🏪 Creating Canadian stores...");
  
  const canadianStores = [
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
  for (const storeData of canadianStores) {
    const store = await prisma.store.create({
      data: {
        name: storeData.name,
        logo: storeData.logo,
      },
    });
    createdStores.push(store);
    console.log(`  🏪 Created store: ${store.name}`);
  }

  // Create product variants for popular items
  console.log("");
  console.log("📦 Creating product variants...");
  
  let variantCount = 0;

  // Helper function to create variants
  async function createVariants(
    itemName: string,
    variants: ProductVariantData[]
  ) {
    const item = groceryItemsMap.get(itemName);
    if (!item) {
      console.log(`  ⚠️  Item "${itemName}" not found, skipping variants`);
      return;
    }

    let created = 0;
    for (const variantData of variants) {
      const store = createdStores.find((s) => s.name === variantData.store);
      if (store) {
        try {
          await prisma.productVariant.create({
            data: {
              groceryItemId: item.id,
              storeId: store.id,
              name: variantData.name,
              price: variantData.price ?? null,
              imageUrl: null,
            },
          });
          variantCount++;
          created++;
        } catch (error: any) {
          // Variant might already exist, skip silently
          if (!error.message?.includes("Unique constraint") && !error.code?.includes("P2002")) {
            console.error(`  ❌ Error creating variant for ${itemName}:`, variantData.name, error.message);
          }
        }
      }
    }
    if (created > 0) {
      console.log(`  ✓ Created ${created} variants for ${itemName}`);
    }
  }

  // Apples - Canadian varieties
  await createVariants("Apples", [
    { store: "Loblaws", name: "Gala Apples", price: 3.99 },
    { store: "Loblaws", name: "Red Delicious Apples", price: 3.49 },
    { store: "Loblaws", name: "Honeycrisp Apples", price: 5.99 },
    { store: "Loblaws", name: "Granny Smith Apples", price: 3.79 },
    { store: "Loblaws", name: "Ambrosia Apples", price: 4.49 },
    { store: "Metro", name: "Gala Apples", price: 3.89 },
    { store: "Metro", name: "Honeycrisp Apples", price: 5.79 },
    { store: "Metro", name: "Red Delicious Apples", price: 3.39 },
    { store: "Metro", name: "Fuji Apples", price: 4.29 },
    { store: "Sobeys", name: "Gala Apples", price: 4.19 },
    { store: "Sobeys", name: "Honeycrisp Apples", price: 6.29 },
    { store: "Sobeys", name: "Ambrosia Apples", price: 4.79 },
    { store: "Real Canadian Superstore", name: "Gala Apples", price: 3.49 },
    { store: "Real Canadian Superstore", name: "Red Delicious Apples", price: 2.99 },
    { store: "Real Canadian Superstore", name: "Honeycrisp Apples", price: 5.49 },
    { store: "No Frills", name: "Gala Apples", price: 2.99 },
    { store: "No Frills", name: "Red Delicious Apples", price: 2.79 },
    { store: "FreshCo", name: "Gala Apples", price: 3.29 },
    { store: "FreshCo", name: "Red Delicious Apples", price: 2.99 },
    { store: "Food Basics", name: "Gala Apples", price: 2.89 },
    { store: "Food Basics", name: "Red Delicious Apples", price: 2.69 },
    { store: "Longo's", name: "Organic Gala Apples", price: 5.99 },
    { store: "Longo's", name: "Organic Honeycrisp Apples", price: 7.49 },
    { store: "Whole Foods", name: "Organic Gala Apples", price: 6.49 },
    { store: "Whole Foods", name: "Organic Honeycrisp Apples", price: 7.99 },
    { store: "Costco", name: "Gala Apples (3kg bag)", price: 8.99 },
    { store: "Costco", name: "Honeycrisp Apples (3kg bag)", price: 12.99 },
    { store: "Walmart", name: "Gala Apples", price: 3.29 },
    { store: "Walmart", name: "Red Delicious Apples", price: 2.99 },
    { store: "T&T Supermarket", name: "Fuji Apples", price: 3.99 },
    { store: "T&T Supermarket", name: "Gala Apples", price: 3.49 },
  ]);

  // Goat Milk - Canadian brands
  await createVariants("Goat Milk", [
    { store: "Loblaws", name: "Harmony Organic Goat Milk (1L)", price: 6.99 },
    { store: "Loblaws", name: "Lactantia Goat Milk (1L)", price: 5.49 },
    { store: "Metro", name: "Harmony Organic Goat Milk (1L)", price: 7.29 },
    { store: "Metro", name: "Lactantia Goat Milk (1L)", price: 5.79 },
    { store: "Sobeys", name: "Harmony Organic Goat Milk (1L)", price: 7.49 },
    { store: "Sobeys", name: "Lactantia Goat Milk (1L)", price: 5.99 },
    { store: "Real Canadian Superstore", name: "Harmony Organic Goat Milk (1L)", price: 6.49 },
    { store: "Real Canadian Superstore", name: "Lactantia Goat Milk (1L)", price: 5.29 },
    { store: "No Frills", name: "Lactantia Goat Milk (1L)", price: 4.99 },
    { store: "FreshCo", name: "Lactantia Goat Milk (1L)", price: 5.19 },
    { store: "Food Basics", name: "Goat Milk (1L)", price: 4.79 },
    { store: "Whole Foods", name: "Harmony Organic Goat Milk (1L)", price: 7.99 },
    { store: "Longo's", name: "Harmony Organic Goat Milk (1L)", price: 7.49 },
    { store: "Walmart", name: "Lactantia Goat Milk (1L)", price: 5.29 },
  ]);

  // Milk - Canadian brands
  await createVariants("Milk", [
    { store: "Loblaws", name: "Neilson 2% Milk (4L)", price: 5.99 },
    { store: "Loblaws", name: "Lactantia 2% Milk (4L)", price: 6.49 },
    { store: "Loblaws", name: "Natrel 2% Milk (4L)", price: 6.99 },
    { store: "Metro", name: "Neilson 2% Milk (4L)", price: 6.29 },
    { store: "Metro", name: "Lactantia 2% Milk (4L)", price: 6.79 },
    { store: "Sobeys", name: "Lactantia 2% Milk (4L)", price: 6.99 },
    { store: "Sobeys", name: "Natrel 2% Milk (4L)", price: 7.29 },
    { store: "Real Canadian Superstore", name: "No Name 2% Milk (4L)", price: 4.99 },
    { store: "Real Canadian Superstore", name: "Neilson 2% Milk (4L)", price: 5.79 },
    { store: "No Frills", name: "2% Milk", price: 4.49 },
    { store: "No Frills", name: "No Name 2% Milk (4L)", price: 4.79 },
    { store: "FreshCo", name: "Neilson 2% Milk (4L)", price: 5.49 },
    { store: "Food Basics", name: "No Name 2% Milk (4L)", price: 4.69 },
    { store: "Costco", name: "Natrel 2% Milk (4L x 2)", price: 12.99 },
    { store: "Walmart", name: "Neilson 2% Milk (4L)", price: 5.49 },
  ]);

  // Bread - Canadian brands
  await createVariants("Bread", [
    { store: "Loblaws", name: "Wonder Bread White (675g)", price: 3.49 },
    { store: "Loblaws", name: "Dempster's Whole Wheat (675g)", price: 3.99 },
    { store: "Loblaws", name: "Country Harvest 12 Grain (675g)", price: 4.49 },
    { store: "Metro", name: "Wonder Bread White (675g)", price: 3.79 },
    { store: "Metro", name: "Dempster's Whole Wheat (675g)", price: 4.29 },
    { store: "Sobeys", name: "Dempster's White (675g)", price: 3.99 },
    { store: "Sobeys", name: "Country Harvest 12 Grain (675g)", price: 4.79 },
    { store: "Real Canadian Superstore", name: "No Name White Bread (675g)", price: 2.99 },
    { store: "Real Canadian Superstore", name: "Dempster's Whole Wheat (675g)", price: 3.79 },
    { store: "No Frills", name: "No Name White Bread (675g)", price: 2.49 },
    { store: "FreshCo", name: "Wonder Bread White (675g)", price: 3.29 },
    { store: "Food Basics", name: "No Name White Bread (675g)", price: 2.79 },
    { store: "Costco", name: "Dempster's White Bread (2x675g)", price: 5.99 },
    { store: "Walmart", name: "Wonder Bread White (675g)", price: 3.29 },
  ]);

  // Eggs - Canadian sizes
  await createVariants("Eggs", [
    { store: "Loblaws", name: "Large Eggs (12 count)", price: 4.99 },
    { store: "Loblaws", name: "Extra Large Eggs (12 count)", price: 5.49 },
    { store: "Loblaws", name: "Free Run Eggs (12 count)", price: 6.99 },
    { store: "Metro", name: "Large Eggs (12 count)", price: 5.29 },
    { store: "Metro", name: "Free Run Eggs (12 count)", price: 7.29 },
    { store: "Sobeys", name: "Large Eggs (12 count)", price: 5.49 },
    { store: "Sobeys", name: "Organic Eggs (12 count)", price: 8.99 },
    { store: "Real Canadian Superstore", name: "No Name Large Eggs (12 count)", price: 4.49 },
    { store: "Real Canadian Superstore", name: "Large Eggs (12 count)", price: 4.99 },
    { store: "No Frills", name: "Large Grade A Eggs", price: 3.99 },
    { store: "No Frills", name: "No Name Large Eggs (12 count)", price: 4.29 },
    { store: "FreshCo", name: "Large Eggs (12 count)", price: 4.79 },
    { store: "Food Basics", name: "Large Eggs (12 count)", price: 4.49 },
    { store: "Costco", name: "Large Eggs (24 count)", price: 8.99 },
    { store: "Walmart", name: "Large Eggs (12 count)", price: 4.79 },
  ]);

  // Chicken Breast
  await createVariants("Chicken Breast", [
    { store: "Loblaws", name: "Boneless Skinless Chicken Breast (per kg)", price: 15.99 },
    { store: "Loblaws", name: "Maple Leaf Chicken Breast (per kg)", price: 16.99 },
    { store: "Metro", name: "Boneless Skinless Chicken Breast (per kg)", price: 16.49 },
    { store: "Sobeys", name: "Boneless Skinless Chicken Breast (per kg)", price: 17.99 },
    { store: "Real Canadian Superstore", name: "No Name Chicken Breast (per kg)", price: 14.99 },
    { store: "Real Canadian Superstore", name: "Boneless Skinless Chicken Breast (per kg)", price: 15.49 },
    { store: "No Frills", name: "No Name Chicken Breast (per kg)", price: 13.99 },
    { store: "FreshCo", name: "Boneless Skinless Chicken Breast (per kg)", price: 15.29 },
    { store: "Food Basics", name: "Chicken Breast (per kg)", price: 14.49 },
    { store: "Costco", name: "Boneless Skinless Chicken Breast (2kg pack)", price: 27.99 },
    { store: "Walmart", name: "Boneless Skinless Chicken Breast (per kg)", price: 15.49 },
  ]);

  // Bananas
  await createVariants("Bananas", [
    { store: "Loblaws", name: "Bananas (per kg)", price: 2.49 },
    { store: "Metro", name: "Bananas (per kg)", price: 2.69 },
    { store: "Sobeys", name: "Bananas (per kg)", price: 2.79 },
    { store: "Real Canadian Superstore", name: "Bananas (per kg)", price: 2.29 },
    { store: "No Frills", name: "Bananas, Bunch", price: 1.99 },
    { store: "No Frills", name: "Bananas (per kg)", price: 1.99 },
    { store: "FreshCo", name: "Bananas (per kg)", price: 2.19 },
    { store: "Food Basics", name: "Bananas (per kg)", price: 1.89 },
    { store: "Costco", name: "Bananas (bunch)", price: 2.99 },
    { store: "Walmart", name: "Bananas (per kg)", price: 2.19 },
  ]);

  // Tomatoes
  await createVariants("Tomatoes", [
    { store: "Loblaws", name: "Roma Tomatoes (per kg)", price: 4.99 },
    { store: "Loblaws", name: "Beefsteak Tomatoes (per kg)", price: 5.99 },
    { store: "Metro", name: "Roma Tomatoes (per kg)", price: 5.29 },
    { store: "Sobeys", name: "Roma Tomatoes (per kg)", price: 5.49 },
    { store: "Real Canadian Superstore", name: "Roma Tomatoes (per kg)", price: 4.49 },
    { store: "No Frills", name: "Roma Tomatoes (per kg)", price: 3.99 },
    { store: "FreshCo", name: "Roma Tomatoes (per kg)", price: 4.79 },
    { store: "Food Basics", name: "Roma Tomatoes (per kg)", price: 4.29 },
    { store: "Costco", name: "Roma Tomatoes (2kg)", price: 7.99 },
    { store: "Walmart", name: "Roma Tomatoes (per kg)", price: 4.79 },
  ]);

  // Butter - Canadian brands
  await createVariants("Butter", [
    { store: "Loblaws", name: "Lactantia Butter (454g)", price: 6.99 },
    { store: "Loblaws", name: "Gay Lea Butter (454g)", price: 6.49 },
    { store: "Metro", name: "Lactantia Butter (454g)", price: 7.29 },
    { store: "Sobeys", name: "Lactantia Butter (454g)", price: 7.49 },
    { store: "Real Canadian Superstore", name: "No Name Butter (454g)", price: 5.99 },
    { store: "Real Canadian Superstore", name: "Lactantia Butter (454g)", price: 6.79 },
    { store: "No Frills", name: "No Name Butter (454g)", price: 5.49 },
    { store: "FreshCo", name: "Lactantia Butter (454g)", price: 6.49 },
    { store: "Food Basics", name: "Butter (454g)", price: 5.79 },
    { store: "Costco", name: "Lactantia Butter (454g x 2)", price: 12.99 },
    { store: "Walmart", name: "Lactantia Butter (454g)", price: 6.49 },
  ]);

  // Ground Beef
  await createVariants("Ground Beef", [
    { store: "Loblaws", name: "Lean Ground Beef (per kg)", price: 12.99 },
    { store: "Loblaws", name: "Extra Lean Ground Beef (per kg)", price: 14.99 },
    { store: "Metro", name: "Lean Ground Beef (per kg)", price: 13.49 },
    { store: "Sobeys", name: "Lean Ground Beef (per kg)", price: 14.99 },
    { store: "Real Canadian Superstore", name: "No Name Lean Ground Beef (per kg)", price: 11.99 },
    { store: "Real Canadian Superstore", name: "Lean Ground Beef (per kg)", price: 12.49 },
    { store: "No Frills", name: "No Name Lean Ground Beef (per kg)", price: 10.99 },
    { store: "FreshCo", name: "Lean Ground Beef (per kg)", price: 12.29 },
    { store: "Food Basics", name: "Lean Ground Beef (per kg)", price: 11.49 },
    { store: "Costco", name: "Lean Ground Beef (2kg pack)", price: 23.99 },
    { store: "Walmart", name: "Lean Ground Beef (per kg)", price: 12.49 },
  ]);

  // Cheddar Cheese
  await createVariants("Cheddar Cheese", [
    { store: "Loblaws", name: "Black Diamond Cheddar (400g)", price: 7.99 },
    { store: "Loblaws", name: "Cracker Barrel Cheddar (400g)", price: 8.49 },
    { store: "Metro", name: "Black Diamond Cheddar (400g)", price: 8.29 },
    { store: "Sobeys", name: "Black Diamond Cheddar (400g)", price: 8.49 },
    { store: "Real Canadian Superstore", name: "No Name Cheddar (400g)", price: 6.99 },
    { store: "Real Canadian Superstore", name: "Black Diamond Cheddar (400g)", price: 7.79 },
    { store: "No Frills", name: "Marble Cheddar Cheese", price: 6.49 },
    { store: "No Frills", name: "No Name Cheddar (400g)", price: 6.29 },
    { store: "FreshCo", name: "Black Diamond Cheddar (400g)", price: 7.49 },
    { store: "Food Basics", name: "Cheddar Cheese (400g)", price: 6.79 },
    { store: "Costco", name: "Black Diamond Cheddar (1kg)", price: 16.99 },
    { store: "Walmart", name: "Black Diamond Cheddar (400g)", price: 7.49 },
  ]);

  // Pasta
  await createVariants("Pasta", [
    { store: "Loblaws", name: "Catelli Spaghetti (500g)", price: 2.99 },
    { store: "Loblaws", name: "No Name Pasta (500g)", price: 1.99 },
    { store: "Metro", name: "Catelli Spaghetti (500g)", price: 3.29 },
    { store: "Sobeys", name: "Catelli Spaghetti (500g)", price: 3.49 },
    { store: "Real Canadian Superstore", name: "No Name Pasta (500g)", price: 1.49 },
    { store: "No Frills", name: "No Name Pasta (500g)", price: 1.29 },
    { store: "FreshCo", name: "Catelli Spaghetti (500g)", price: 2.79 },
    { store: "Food Basics", name: "Pasta (500g)", price: 1.79 },
    { store: "Costco", name: "Catelli Spaghetti (1kg x 2)", price: 7.99 },
    { store: "Walmart", name: "Catelli Spaghetti (500g)", price: 2.79 },
  ]);

  // Oranges
  await createVariants("Oranges", [
    { store: "Loblaws", name: "Navel Oranges (per kg)", price: 4.99 },
    { store: "Metro", name: "Navel Oranges (per kg)", price: 5.29 },
    { store: "Sobeys", name: "Navel Oranges (per kg)", price: 5.49 },
    { store: "Real Canadian Superstore", name: "Navel Oranges (per kg)", price: 4.49 },
    { store: "No Frills", name: "Navel Oranges (per kg)", price: 3.99 },
    { store: "FreshCo", name: "Navel Oranges (per kg)", price: 4.79 },
    { store: "Food Basics", name: "Navel Oranges (per kg)", price: 4.29 },
    { store: "Costco", name: "Navel Oranges (bag)", price: 8.99 },
    { store: "Walmart", name: "Navel Oranges (per kg)", price: 4.79 },
  ]);

  // Strawberries
  await createVariants("Strawberries", [
    { store: "Loblaws", name: "Fresh Strawberries (340g)", price: 4.99 },
    { store: "Metro", name: "Fresh Strawberries (340g)", price: 5.29 },
    { store: "Sobeys", name: "Fresh Strawberries (340g)", price: 5.49 },
    { store: "Real Canadian Superstore", name: "Fresh Strawberries (340g)", price: 4.49 },
    { store: "No Frills", name: "Fresh Strawberries (340g)", price: 3.99 },
    { store: "FreshCo", name: "Fresh Strawberries (340g)", price: 4.79 },
    { store: "Food Basics", name: "Fresh Strawberries (340g)", price: 4.29 },
    { store: "Costco", name: "Fresh Strawberries (1kg)", price: 9.99 },
    { store: "Walmart", name: "Fresh Strawberries (340g)", price: 4.79 },
  ]);

  // Carrots
  await createVariants("Carrots", [
    { store: "Loblaws", name: "Baby Carrots (1kg bag)", price: 3.99 },
    { store: "Loblaws", name: "Whole Carrots (per kg)", price: 2.99 },
    { store: "Metro", name: "Baby Carrots (1kg bag)", price: 4.29 },
    { store: "Sobeys", name: "Baby Carrots (1kg bag)", price: 4.49 },
    { store: "Real Canadian Superstore", name: "No Name Carrots (1kg bag)", price: 3.49 },
    { store: "No Frills", name: "No Name Carrots (1kg bag)", price: 2.99 },
    { store: "FreshCo", name: "Baby Carrots (1kg bag)", price: 3.79 },
    { store: "Food Basics", name: "Carrots (1kg bag)", price: 3.29 },
    { store: "Costco", name: "Baby Carrots (2kg bag)", price: 6.99 },
    { store: "Walmart", name: "Baby Carrots (1kg bag)", price: 3.79 },
  ]);

  // Lettuce
  await createVariants("Lettuce", [
    { store: "Loblaws", name: "Iceberg Lettuce (head)", price: 2.99 },
    { store: "Loblaws", name: "Romaine Lettuce (head)", price: 3.49 },
    { store: "Metro", name: "Iceberg Lettuce (head)", price: 3.29 },
    { store: "Sobeys", name: "Romaine Lettuce (head)", price: 3.79 },
    { store: "Real Canadian Superstore", name: "Iceberg Lettuce (head)", price: 2.49 },
    { store: "No Frills", name: "Iceberg Lettuce (head)", price: 1.99 },
    { store: "FreshCo", name: "Iceberg Lettuce (head)", price: 2.79 },
    { store: "Food Basics", name: "Iceberg Lettuce (head)", price: 2.29 },
    { store: "Walmart", name: "Iceberg Lettuce (head)", price: 2.79 },
  ]);

  // Potatoes
  await createVariants("Potatoes", [
    { store: "Loblaws", name: "Russet Potatoes (5kg bag)", price: 6.99 },
    { store: "Loblaws", name: "Red Potatoes (2kg bag)", price: 4.99 },
    { store: "Metro", name: "Russet Potatoes (5kg bag)", price: 7.29 },
    { store: "Sobeys", name: "Russet Potatoes (5kg bag)", price: 7.49 },
    { store: "Real Canadian Superstore", name: "No Name Potatoes (5kg bag)", price: 5.99 },
    { store: "No Frills", name: "No Name Potatoes (5kg bag)", price: 4.99 },
    { store: "FreshCo", name: "Russet Potatoes (5kg bag)", price: 6.49 },
    { store: "Food Basics", name: "Potatoes (5kg bag)", price: 5.49 },
    { store: "Costco", name: "Russet Potatoes (10kg bag)", price: 9.99 },
    { store: "Walmart", name: "Russet Potatoes (5kg bag)", price: 6.49 },
  ]);

  // Additional basic products from No Frills
  // Peanut Butter
  await createVariants("Peanut Butter", [
    { store: "Loblaws", name: "Kraft Smooth Peanut Butter (1kg)", price: 6.99 },
    { store: "Metro", name: "Kraft Smooth Peanut Butter (1kg)", price: 7.29 },
    { store: "Sobeys", name: "Kraft Smooth Peanut Butter (1kg)", price: 7.49 },
    { store: "Real Canadian Superstore", name: "No Name Smooth Peanut Butter (1kg)", price: 5.99 },
    { store: "No Frills", name: "Smooth Peanut Butter", price: 5.49 },
    { store: "No Frills", name: "No Name Smooth Peanut Butter (1kg)", price: 5.29 },
    { store: "FreshCo", name: "Kraft Smooth Peanut Butter (1kg)", price: 6.49 },
    { store: "Food Basics", name: "Smooth Peanut Butter (1kg)", price: 5.79 },
    { store: "Walmart", name: "Kraft Smooth Peanut Butter (1kg)", price: 6.49 },
  ]);

  // Tuna
  await createVariants("Tuna", [
    { store: "Loblaws", name: "Clover Leaf Flaked Light Tuna (170g)", price: 2.99 },
    { store: "Metro", name: "Clover Leaf Flaked Light Tuna (170g)", price: 3.29 },
    { store: "Sobeys", name: "Clover Leaf Flaked Light Tuna (170g)", price: 3.49 },
    { store: "Real Canadian Superstore", name: "No Name Flaked Light Tuna (170g)", price: 1.99 },
    { store: "No Frills", name: "Flaked Light Tuna", price: 1.79 },
    { store: "No Frills", name: "No Name Flaked Light Tuna (170g)", price: 1.49 },
    { store: "FreshCo", name: "Clover Leaf Flaked Light Tuna (170g)", price: 2.79 },
    { store: "Food Basics", name: "Flaked Light Tuna (170g)", price: 2.29 },
    { store: "Walmart", name: "Clover Leaf Flaked Light Tuna (170g)", price: 2.79 },
  ]);

  // Rice
  await createVariants("Rice", [
    { store: "Loblaws", name: "Uncle Ben's Basmati Rice (1kg)", price: 4.99 },
    { store: "Metro", name: "Uncle Ben's Basmati Rice (1kg)", price: 5.29 },
    { store: "Sobeys", name: "Uncle Ben's Basmati Rice (1kg)", price: 5.49 },
    { store: "Real Canadian Superstore", name: "No Name Basmati Rice (1kg)", price: 3.99 },
    { store: "No Frills", name: "Rice Basmati", price: 3.49 },
    { store: "No Frills", name: "No Name Basmati Rice (1kg)", price: 3.29 },
    { store: "FreshCo", name: "Uncle Ben's Basmati Rice (1kg)", price: 4.79 },
    { store: "Food Basics", name: "Basmati Rice (1kg)", price: 4.29 },
    { store: "Walmart", name: "Uncle Ben's Basmati Rice (1kg)", price: 4.79 },
  ]);

  // Toilet Paper
  await createVariants("Toilet Paper", [
    { store: "Loblaws", name: "Cashmere Bathroom Tissue (12 pack)", price: 9.99 },
    { store: "Metro", name: "Cashmere Bathroom Tissue (12 pack)", price: 10.49 },
    { store: "Sobeys", name: "Cashmere Bathroom Tissue (12 pack)", price: 10.99 },
    { store: "Real Canadian Superstore", name: "No Name Bathroom Tissue (12 pack)", price: 7.99 },
    { store: "No Frills", name: "Super Soft Hypoallergenic Bathroom Tissue 12 Pack", price: 7.49 },
    { store: "No Frills", name: "No Name Bathroom Tissue (12 pack)", price: 6.99 },
    { store: "FreshCo", name: "Cashmere Bathroom Tissue (12 pack)", price: 9.49 },
    { store: "Food Basics", name: "Bathroom Tissue (12 pack)", price: 7.99 },
    { store: "Costco", name: "Kirkland Bathroom Tissue (30 pack)", price: 19.99 },
    { store: "Walmart", name: "Cashmere Bathroom Tissue (12 pack)", price: 9.49 },
  ]);

  // ═══════════════════════════════════════════════════════
  // NFC Tag Analytics — Demo Data
  // ═══════════════════════════════════════════════════════

  console.log("");
  console.log("📡 Creating NFC demo data...");

  // Clear existing NFC data
  await prisma.myListItem.deleteMany();
  await prisma.myList.deleteMany();
  await prisma.tapEvent.deleteMany();
  await prisma.nfcTag.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.tagBatch.deleteMany();

  // Create demo batches
  const demoBatch1 = await prisma.tagBatch.create({
    data: {
      slug: "homedepot-2026-q1",
      name: "Home Depot Q1 2026",
      description: "Home Depot grocery cross-promotion campaign for Q1 2026",
    },
  });
  console.log(`  📦 Created batch: ${demoBatch1.name}`);

  const demoBatch2 = await prisma.tagBatch.create({
    data: {
      slug: "costco-welcome-pack",
      name: "Costco Welcome Pack",
      description: "NFC tags included in Costco membership welcome kits",
    },
  });
  console.log(`  📦 Created batch: ${demoBatch2.name}`);

  // Generate demo tags for batch 1
  const batch1Tags = [];
  for (let i = 1; i <= 10; i++) {
    const tag = await prisma.nfcTag.create({
      data: {
        publicUuid: uuidv4(),
        batchId: demoBatch1.id,
        label: `HD Tag ${String(i).padStart(3, "0")}`,
        status: i <= 8 ? "active" : "disabled",
      },
    });
    batch1Tags.push(tag);
  }
  console.log(`  🏷️  Created ${batch1Tags.length} tags for ${demoBatch1.name}`);

  // Generate demo tags for batch 2
  const batch2Tags = [];
  for (let i = 1; i <= 5; i++) {
    const tag = await prisma.nfcTag.create({
      data: {
        publicUuid: uuidv4(),
        batchId: demoBatch2.id,
        label: `Costco Tag ${String(i).padStart(3, "0")}`,
        status: "active",
      },
    });
    batch2Tags.push(tag);
  }
  console.log(`  🏷️  Created ${batch2Tags.length} tags for ${demoBatch2.name}`);

  // Create a demo visitor
  const demoVisitor = await prisma.visitor.create({
    data: {
      anonVisitorId: uuidv4(),
      firstSeenAt: new Date("2026-01-15"),
      lastSeenAt: new Date(),
      tapCount: 5,
      lastTagId: batch1Tags[0]?.id || null,
      lastBatchId: demoBatch1.id,
    },
  });
  console.log(`  👤 Created demo visitor: ${demoVisitor.anonVisitorId.slice(0, 8)}...`);

  // Create demo tap events
  const tapTimestamps = [
    new Date("2026-01-15T10:30:00Z"),
    new Date("2026-01-20T14:15:00Z"),
    new Date("2026-02-01T09:45:00Z"),
    new Date("2026-02-05T16:20:00Z"),
    new Date("2026-02-08T11:00:00Z"),
  ];

  for (let i = 0; i < tapTimestamps.length; i++) {
    await prisma.tapEvent.create({
      data: {
        tagId: batch1Tags[i % batch1Tags.length].id,
        batchId: demoBatch1.id,
        occurredAt: tapTimestamps[i],
        ipHash: `demo-hash-${i}`,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)",
        deviceHint: "mobile",
        anonVisitorId: demoVisitor.anonVisitorId,
        visitorId: demoVisitor.id,
        isDuplicate: false,
      },
    });
  }
  console.log(`  ⚡ Created ${tapTimestamps.length} demo tap events`);

  // Initialize AppConfig if it doesn't exist
  console.log("");
  console.log("⚙️  Initializing app settings...");
  const appConfig = await prisma.appConfig.upsert({
    where: { id: "global" },
    update: {}, // Don't update if exists
    create: {
      id: "global",
      showPriceRange: true,
    },
  });
  console.log(`   ✅ App settings initialized (showPriceRange: ${appConfig.showPriceRange})`);

  console.log("");
  console.log("✅ Seed completed!");
  console.log(`   📁 ${categories.length} categories`);
  console.log(`   📦 ${totalItems} grocery items`);
  console.log(`   🏪 ${createdStores.length} Canadian stores`);
  console.log(`   📦 ${variantCount} product variants`);
  console.log(`   📡 ${2} NFC batches`);
  console.log(`   🏷️  ${batch1Tags.length + batch2Tags.length} NFC tags`);
  console.log(`   ⚡ ${tapTimestamps.length} demo tap events`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
