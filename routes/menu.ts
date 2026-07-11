import { Router, type IRouter } from "express";
import { asc, count, eq } from "drizzle-orm";
import { db, menuCategoriesTable, menuItemsTable } from "@workspace/db";
import { z } from "zod";
import {
  CreateMenuItemBody,
  CreateMenuItemResponse,
  UpdateMenuItemParams,
  UpdateMenuItemBody,
  UpdateMenuItemResponse,
  ListMenuCategoriesResponse,
  ListMenuItemsResponse,
} from "@workspace/api-zod";

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const router: IRouter = Router();

router.get("/menu-categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(menuCategoriesTable)
    .orderBy(asc(menuCategoriesTable.sortOrder));

  const items = await db
    .select()
    .from(menuItemsTable)
    .where(eq(menuItemsTable.active, true))
    .orderBy(asc(menuItemsTable.name));

  const result = categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    items: items
      .filter((item) => item.categoryId === category.id)
      .map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        name: item.name,
        price: Number(item.price),
        active: item.active,
        imageUrl: item.imageUrl,
      })),
  }));

  res.json(ListMenuCategoriesResponse.parse(result));
});

router.get("/menu-items", async (_req, res): Promise<void> => {
  const items = await db.select().from(menuItemsTable).orderBy(asc(menuItemsTable.name));
  const result = items.map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    price: Number(item.price),
    active: item.active,
    imageUrl: item.imageUrl,
  }));
  res.json(ListMenuItemsResponse.parse(result));
});

router.post("/menu-items", async (req, res): Promise<void> => {
  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(menuItemsTable)
    .values({
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      price: parsed.data.price.toString(),
      active: parsed.data.active ?? true,
      imageUrl: parsed.data.imageUrl ?? null,
    })
    .returning();

  res.status(201).json(
    CreateMenuItemResponse.parse({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      price: Number(item.price),
      active: item.active,
      imageUrl: item.imageUrl,
    }),
  );
});

router.patch("/menu-items/:id", async (req, res): Promise<void> => {
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof menuItemsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.price !== undefined) updates.price = parsed.data.price.toString();
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;
  if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId;
  if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl;

  const [item] = await db
    .update(menuItemsTable)
    .set(updates)
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json(
    UpdateMenuItemResponse.parse({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      price: Number(item.price),
      active: item.active,
      imageUrl: item.imageUrl,
    }),
  );
});

// Admin: all items including inactive, for the menu editor
router.get("/menu-categories-admin", async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(menuCategoriesTable)
    .orderBy(asc(menuCategoriesTable.sortOrder));

  const items = await db
    .select()
    .from(menuItemsTable)
    .orderBy(asc(menuItemsTable.name));

  const result = categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    items: items
      .filter((item) => item.categoryId === category.id)
      .map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        name: item.name,
        price: Number(item.price),
        active: item.active,
        imageUrl: item.imageUrl,
      })),
  }));

  res.json(result);
});

router.post("/menu-categories", async (req, res): Promise<void> => {
  const body = z.object({ name: z.string().min(1), sortOrder: z.number().int().default(0) }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [cat] = await db
    .insert(menuCategoriesTable)
    .values({ name: body.data.name, sortOrder: body.data.sortOrder })
    .returning();

  res.status(201).json({ id: cat.id, name: cat.name, sortOrder: cat.sortOrder });
});

router.patch("/menu-categories/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = z.object({ name: z.string().min(1).optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const updates: Partial<typeof menuCategoriesTable.$inferInsert> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.sortOrder !== undefined) updates.sortOrder = body.data.sortOrder;

  const [cat] = await db
    .update(menuCategoriesTable)
    .set(updates)
    .where(eq(menuCategoriesTable.id, params.data.id))
    .returning();

  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json({ id: cat.id, name: cat.name, sortOrder: cat.sortOrder });
});

router.delete("/menu-categories/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  // Guard: refuse if items exist
  const [{ total }] = await db
    .select({ total: count() })
    .from(menuItemsTable)
    .where(eq(menuItemsTable.categoryId, params.data.id));

  if (Number(total) > 0) {
    res.status(409).json({ error: "Remove all items from this category before deleting it." });
    return;
  }

  await db.delete(menuCategoriesTable).where(eq(menuCategoriesTable.id, params.data.id));
  res.status(204).send();
});

router.delete("/menu-items/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
