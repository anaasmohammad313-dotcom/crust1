import { db, pool } from "./index";
import { menuCategoriesTable, menuItemsTable } from "./schema/menu";

const MENU: { category: string; items: [string, number][] }[] = [
  {
    category: "Starters",
    items: [
      ["French Fries", 50],
      ["Peri Peri Fries", 60],
      ["Cheesy Fries", 70],
      ["Nuggets", 70],
      ["Broasted Strips", 70],
      ["Spicy Strips", 80],
      ["BBQ Chicken (2 pcs)", 80],
      ["Hot & Spicy Chicken (2 pcs)", 80],
      ["Extra Mayonnaise", 10],
    ],
  },
  {
    category: "Veg Burgers",
    items: [
      ["Veg Burger", 50],
      ["Aloo Tikki Burger", 50],
      ["Paneer Chilly Burger", 50],
    ],
  },
  {
    category: "Non Veg Burgers",
    items: [
      ["Chicken Shawarma Burger", 50],
      ["Tandoori Burger", 60],
      ["Mexican Chicken Burger", 60],
      ["Zinger Burger", 70],
      ["Kabab Burger", 70],
      ["Peri Peri Zinger Burger", 80],
      ["Afghani Burger", 80],
      ["Korean Burger", 90],
      ["Crust Crispy Burger", 100],
      ["Add On Cheese", 10],
    ],
  },
  {
    category: "Momos",
    items: [
      ["Chicken Fried Momos", 70],
      ["Tikka Momos", 80],
      ["Paneer Momos", 80],
      ["Peri Peri Momos", 90],
      ["Manchurian Momos", 90],
      ["Cheese Burst Momos", 130],
    ],
  },
  {
    category: "Veg Sandwich",
    items: [
      ["Paneer Sandwich", 60],
      ["Paneer Pizza Sandwich", 80],
    ],
  },
  {
    category: "Non Veg Sandwich",
    items: [
      ["Chicken Sandwich", 60],
      ["Tikka Cheese Sandwich", 80],
      ["Bademiya Jumbo Sandwich", 90],
      ["Add On Cheese", 10],
    ],
  },
  {
    category: "Veg Wraps",
    items: [
      ["Paneer Chilli Wrap", 50],
      ["Spicy Paneer Wrap", 60],
    ],
  },
  {
    category: "Non Veg Wraps",
    items: [
      ["Chicken Wrap", 40],
      ["Chicken Lays Wrap", 40],
      ["Mexican Shawarma Wrap", 50],
      ["Chicken Chilly Wrap", 50],
      ["Butter Chicken Wrap", 50],
      ["Zinger Wrap", 70],
      ["Kabab Wrap", 70],
      ["Afghani Wrap", 80],
    ],
  },
  {
    category: "Broasted",
    items: [
      ["Broasted Chicken Per Piece", 60],
      ["Half Bucket (4 Pieces)", 230],
      ["Full Bucket (8 Pieces)", 460],
    ],
  },
];

async function seed() {
  const existing = await db.select().from(menuCategoriesTable);
  if (existing.length > 0) {
    console.log(`Menu already has ${existing.length} categories, skipping seed.`);
    return;
  }

  for (let i = 0; i < MENU.length; i++) {
    const { category, items } = MENU[i];
    const [row] = await db
      .insert(menuCategoriesTable)
      .values({ name: category, sortOrder: i })
      .returning();

    await db.insert(menuItemsTable).values(
      items.map(([name, price]) => ({
        categoryId: row.id,
        name,
        price: price.toFixed(2),
        active: true,
      })),
    );
    console.log(`Seeded category "${category}" with ${items.length} items.`);
  }
}

seed()
  .then(() => {
    console.log("Menu seed complete.");
    return pool.end();
  })
  .catch((err) => {
    console.error("Menu seed failed:", err);
    return pool.end().finally(() => process.exit(1));
  });
