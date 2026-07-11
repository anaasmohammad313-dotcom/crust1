/**
 * Offline-first order queue.
 *
 * Pure functions — no React, no side effects beyond localStorage.
 * Each pending order gets a stable `localId` so duplicates are never sent.
 */

import type { OrderInput, Order } from "@workspace/api-client-react";

export interface OfflineOrder {
  /** Stable client-generated ID used for deduplication. */
  localId: string;
  orderData: OrderInput;
  queuedAt: number; // unix ms
  /** How many sync attempts have failed for this entry. */
  attempts: number;
}

const STORAGE_KEY = "offlineOrders";
const MAX_ATTEMPTS = 5; // stop retrying after this many failures

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function getOfflineOrders(): OfflineOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOrder[]) : [];
  } catch {
    return [];
  }
}

function persistOrders(orders: OfflineOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    console.error("[offline] Failed to persist orders to localStorage.");
  }
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * saveOrderOffline
 * Appends an order to the offline queue.
 * If an entry with the same localId already exists it is NOT duplicated.
 */
export function saveOrderOffline(orderData: OrderInput): OfflineOrder {
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: OfflineOrder = { localId, orderData, queuedAt: Date.now(), attempts: 0 };

  const orders = getOfflineOrders();
  // Guard: skip if somehow this localId already exists
  if (!orders.some((o) => o.localId === entry.localId)) {
    persistOrders([...orders, entry]);
  }

  console.warn(`[offline] Order saved offline. Queue length: ${orders.length + 1}`);
  return entry;
}

/**
 * placeOrder
 * Attempts to submit an order via the provided API function.
 * Falls back to saveOrderOffline on any network / server error.
 *
 * Returns:
 *   { status: "online",  order }          — API succeeded
 *   { status: "offline", entry }          — saved to queue, will sync later
 */
/** Returns true if the error is an HTTP 401 Unauthorized — not a connectivity issue. */
function isAuthError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 401
  );
}

export async function placeOrder(
  orderData: OrderInput,
  apiFn: (data: OrderInput) => Promise<Order>,
): Promise<
  | { status: "online"; order: Order }
  | { status: "offline"; entry: OfflineOrder }
> {
  try {
    const order = await apiFn(orderData);
    return { status: "online", order };
  } catch (err) {
    // A 401 means the session expired — don't silently queue; re-throw so the
    // caller can redirect to login rather than leaving the order stuck.
    if (isAuthError(err)) throw err;
    console.warn("[offline] API call failed, queuing order locally.", err);
    const entry = saveOrderOffline(orderData);
    return { status: "offline", entry };
  }
}

/**
 * syncOrders
 * Walks the offline queue and attempts to submit each order.
 * - Successful submissions are removed from the queue immediately.
 * - Failed submissions increment the attempt counter.
 * - Entries that exceed MAX_ATTEMPTS are dropped to prevent infinite retries.
 *
 * Returns a summary { synced, failed, dropped }.
 */
export async function syncOrders(
  apiFn: (data: OrderInput) => Promise<Order>,
): Promise<{ synced: number; failed: number; dropped: number }> {
  const orders = getOfflineOrders();
  if (orders.length === 0) return { synced: 0, failed: 0, dropped: 0 };

  console.log(`[offline] Syncing ${orders.length} queued order(s)…`);

  let synced = 0;
  let failed = 0;
  let dropped = 0;

  // Work on a mutable copy; persist only at the end
  const remaining: OfflineOrder[] = [];

  for (const entry of orders) {
    // Drop orders that have exceeded the retry limit
    if (entry.attempts >= MAX_ATTEMPTS) {
      console.error(
        `[offline] Dropping order ${entry.localId} after ${entry.attempts} failed attempts.`,
      );
      dropped++;
      continue;
    }

    try {
      await apiFn(entry.orderData);
      synced++;
      console.log(`[offline] Synced order ${entry.localId}`);
    } catch (err) {
      // A 401 means the session is gone — stop the entire sync run; user must log in first.
      if (isAuthError(err)) {
        console.warn("[offline] Sync aborted — session expired (401). User must log in.");
        remaining.push(...orders.slice(orders.indexOf(entry)));
        break;
      }
      console.warn(`[offline] Failed to sync order ${entry.localId}:`, err);
      remaining.push({ ...entry, attempts: entry.attempts + 1 });
      failed++;
    }
  }

  persistOrders(remaining);

  console.log(
    `[offline] Sync complete — synced: ${synced}, failed: ${failed}, dropped: ${dropped}`,
  );
  return { synced, failed, dropped };
}
