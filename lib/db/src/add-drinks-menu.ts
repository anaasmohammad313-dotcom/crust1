import { db, pool } from "./index";
import { menuCategoriesTable, menuItemsTable } from "./schema/menu";
import { eq } from "drizzle-orm";

const NEW_CATEGORIES: { category: string; items: [string, number][] }[] = [
  {
    category: "Milkshakes",
    items: [
      ["Dark Fantasy Shake", 50],
      ["Kitkat Shake", 50],
      ["Tender Shake", 50],
      ["Sitafal Shake", 50],
      ["Cold Coffee", 50],
    ],
  },
  {
    category: "Mojitos",
    items: [
      ["Passion Fruit", 30],
      ["Virgin Mojito", 30],
      ["Black Currant", 30],
      ["Kiwi", 30],
      ["Strawberry", 30],
      ["Green Apple", 30],
      ["Blue Mint", 30],
      ["Watermelon", 30],
    ],
  },
];

async function run() {
  const existing = await db.select().from(menuCategoriesTable);
  const maxSort = existing.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), -1);

  let nextSort = maxSort + 1;
  for (const { category, items } of NEW_CATEGORIES) {
    const already = existing.find((c) => c.name === category);
    let categoryId: number;

    if (already) {
      categoryId = already.id;
      console.log(`Category "${category}" already exists, adding/updating items only.`);
    } else {
      const [row] = await db
        .insert(menuCategoriesTable)
        .values({ name: category, sortOrder: nextSort })
        .returning();
      categoryId = row.id;
      nextSort++;
    }

    const existingItems = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.categoryId, categoryId));

    for (const [name, price] of items) {
      const found = existingItems.find((i) => i.name === name);
      if (found) {
        console.log(`Item "${name}" already exists in "${category}", skipping.`);
        continue;
      }
      await db.insert(menuItemsTable).values({
        categoryId,
        name,
        price: price.toFixed(2),
        active: true,
      });
    }
    console.log(`Processed category "${category}" with ${items.length} items.`);
  }
}

run()
  .then(() => {
    console.log("Drinks menu update complete.");
    return pool.end();
  })
  .catch((err) => {
    console.error("Drinks menu update failed:", err);
    return pool.end().finally(() => process.exit(1));
  });
