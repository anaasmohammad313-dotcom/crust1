import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, menuItemsTable, orderItemsTable, ordersTable, settingsTable } from "@workspace/db";
import {
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderParams,
  GetOrderResponse,
  ListOrdersQueryParams,
  ListOrdersResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toOrderSummary(order: typeof ordersTable.$inferSelect) {
  return {
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    phoneNumber: order.phoneNumber,
    tableNumber: order.tableNumber,
    subtotal: Number(order.subtotal),
    discountType: order.discountType as "amount" | "percent" | null,
    discountValue: order.discountValue !== null ? Number(order.discountValue) : null,
    total: Number(order.total),
    paymentMethod: order.paymentMethod as "cash" | "upi" | "card" | "pending" | "split",
    paymentSplits: (order.paymentSplits as Array<{ method: string; amount: number }> | null) ?? null,
    cashierName: order.cashierName,
    status: order.status as "paid" | "cancelled" | "refunded",
    createdAt: order.createdAt.toISOString(),
  };
}


router.get("/orders", async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { invoiceNumber, orderId, customerName, phoneNumber, tableNumber, date, paymentMethod } = query.data;

  const conditions = [];
  if (invoiceNumber) conditions.push(eq(ordersTable.invoiceNumber, invoiceNumber));
  if (orderId !== undefined) conditions.push(eq(ordersTable.id, orderId));
  if (customerName) conditions.push(sql`${ordersTable.customerName} ILIKE ${"%" + customerName + "%"}`);
  if (phoneNumber) conditions.push(sql`${ordersTable.phoneNumber} ILIKE ${"%" + phoneNumber + "%"}`);
  if (tableNumber) conditions.push(eq(ordersTable.tableNumber, tableNumber));
  if (paymentMethod) conditions.push(eq(ordersTable.paymentMethod, paymentMethod));
  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    conditions.push(and(gte(ordersTable.createdAt, start), lt(ordersTable.createdAt, end)));
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt));

  res.json(ListOrdersResponse.parse(orders.map(toOrderSummary)));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerName, phoneNumber, tableNumber, cashierName, items, discountType, discountValue, paymentMethod, paymentSplits } =
    parsed.data;

  // Must supply exactly one of paymentMethod or paymentSplits
  if (!paymentMethod && !paymentSplits) {
    res.status(400).json({ error: "Either paymentMethod or paymentSplits must be provided" });
    return;
  }
  if (paymentMethod && paymentSplits) {
    res.status(400).json({ error: "Provide paymentMethod or paymentSplits, not both" });
    return;
  }

  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  const maxTables = settings?.maxTables ?? 20;
  const tableMatch = /^Table (\d+)$/.exec(tableNumber);
  const isValidTable =
    tableNumber === "Take Away" || (tableMatch !== null && Number(tableMatch[1]) >= 1 && Number(tableMatch[1]) <= maxTables);
  if (!isValidTable) {
    res.status(400).json({ error: `"${tableNumber}" is not a valid table (max is Table ${maxTables}, or Take Away)` });
    return;
  }

  // discountType and discountValue must be consistent, and discounts must be
  // sane (non-negative, percent capped at 100) so totals can never increase
  // or go negative because of malformed input.
  if ((discountType == null) !== (discountValue == null)) {
    res.status(400).json({ error: "discountType and discountValue must both be set or both be omitted" });
    return;
  }
  if (discountValue != null && discountValue < 0) {
    res.status(400).json({ error: "discountValue cannot be negative" });
    return;
  }
  if (discountType === "percent" && discountValue != null && discountValue > 100) {
    res.status(400).json({ error: "Percent discount cannot exceed 100" });
    return;
  }

  const menuItemIds = items.map((item) => item.menuItemId);
  const menuItems = await db.select().from(menuItemsTable);
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

  for (const id of menuItemIds) {
    if (!menuItemMap.has(id)) {
      res.status(400).json({ error: `Menu item ${id} not found` });
      return;
    }
  }

  const lineItems = items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId)!;
    const unitPrice = Number(menuItem.price);
    const itemTotal = unitPrice * item.quantity;
    return {
      menuItemId: item.menuItemId,
      name: menuItem.name,
      unitPrice,
      quantity: item.quantity,
      itemTotal,
    };
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.itemTotal, 0);

  let total = subtotal;
  if (discountType === "amount" && discountValue) {
    total = Math.max(0, subtotal - discountValue);
  } else if (discountType === "percent" && discountValue) {
    total = Math.max(0, subtotal - (subtotal * discountValue) / 100);
  }

  // Validate split amounts sum to total (within ₹1 rounding tolerance)
  if (paymentSplits) {
    const splitsTotal = paymentSplits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitsTotal - total) > 1) {
      res.status(400).json({
        error: `Split amounts (${splitsTotal.toFixed(2)}) must equal the order total (${total.toFixed(2)})`,
      });
      return;
    }
  }

  const resolvedPaymentMethod = paymentSplits ? "split" : paymentMethod!;
  const resolvedPaymentSplits = paymentSplits ?? null;

  // Order header + line items must be created atomically so a partial
  // failure never leaves a bill without its items. The invoice number is
  // derived from the generated order id (only known after insert), so we
  // insert with a temporary unique placeholder and then finalize it inside
  // the same transaction -- this is race-free under concurrent order creation.
  const { order, insertedItems } = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(ordersTable)
      .values({
        invoiceNumber: `PENDING-${randomUUID()}`,
        customerName: customerName ?? null,
        phoneNumber: phoneNumber ?? null,
        tableNumber,
        subtotal: subtotal.toString(),
        discountType: discountType ?? null,
        discountValue: discountValue != null ? discountValue.toString() : null,
        total: total.toString(),
        paymentMethod: resolvedPaymentMethod,
        paymentSplits: resolvedPaymentSplits,
        cashierName: cashierName ?? null,
        status: "paid",
      })
      .returning();

    const [finalized] = await tx
      .update(ordersTable)
      .set({ invoiceNumber: `INV-${String(inserted.id).padStart(5, "0")}` })
      .where(eq(ordersTable.id, inserted.id))
      .returning();

    const items = await tx
      .insert(orderItemsTable)
      .values(
        lineItems.map((item) => ({
          orderId: finalized.id,
          menuItemId: item.menuItemId,
          name: item.name,
          unitPrice: item.unitPrice.toString(),
          quantity: item.quantity,
          itemTotal: item.itemTotal.toString(),
        })),
      )
      .returning();

    return { order: finalized, insertedItems: items };
  });

  res.status(201).json(
    CreateOrderResponse.parse({
      ...toOrderSummary(order),
      items: insertedItems.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        itemTotal: Number(item.itemTotal),
      })),
    }),
  );
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

  res.json(
    GetOrderResponse.parse({
      ...toOrderSummary(order),
      items: items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        itemTotal: Number(item.itemTotal),
      })),
    }),
  );
});

router.patch("/orders/:id/status", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

  res.json(
    UpdateOrderStatusResponse.parse({
      ...toOrderSummary(order),
      items: items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        itemTotal: Number(item.itemTotal),
      })),
    }),
  );
});

export default router;
