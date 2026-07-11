/**
 * useOfflineOrders
 *
 * React hook that:
 *  - Exposes placeOrder() — tries the API, falls back to offline queue
 *  - Listens to window "online" to auto-sync the queue
 *  - Tracks pendingCount and isSyncing for UI feedback
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createOrder } from "@workspace/api-client-react";
import type { OrderInput, Order } from "@workspace/api-client-react";
import {
  placeOrder as placeOrderCore,
  syncOrders as syncOrdersCore,
  getOfflineOrders,
} from "@/lib/offline-orders";

export type PlaceOrderResult =
  | { status: "online"; order: Order }
  | { status: "offline" };

export function useOfflineOrders() {
  const [pendingCount, setPendingCount] = useState(() => getOfflineOrders().length);
  const [isSyncing, setIsSyncing] = useState(false);
  // Prevent concurrent sync runs (e.g. rapid "online" events)
  const syncInProgress = useRef(false);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getOfflineOrders().length);
  }, []);

  /** Attempt to flush the offline queue to the API. */
  const syncOrders = useCallback(async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setIsSyncing(true);
    try {
      await syncOrdersCore(createOrder);
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, [refreshPendingCount]);

  /** Auto-sync when the browser comes back online. */
  useEffect(() => {
    window.addEventListener("online", syncOrders);
    return () => window.removeEventListener("online", syncOrders);
  }, [syncOrders]);

  /**
   * placeOrder
   * Drop-in replacement for createOrder.mutate().
   * Calls the API; on failure queues the order in localStorage for later sync.
   */
  const placeOrder = useCallback(
    async (
      orderData: OrderInput,
      callbacks: {
        onSuccess?: (order: Order) => void;
        onOffline?: () => void;
        onError?: (err: unknown) => void;
      } = {},
    ): Promise<void> => {
      const result = await placeOrderCore(orderData, createOrder);
      if (result.status === "online") {
        callbacks.onSuccess?.(result.order);
      } else {
        refreshPendingCount();
        callbacks.onOffline?.();
      }
    },
    [refreshPendingCount],
  );

  return { placeOrder, syncOrders, pendingCount, isSyncing };
}
