// src/hooks/useOrders.ts

import { db } from "../services/firebase";
import { selectors, useMedStore } from "../services/medsService";
import { orderSelectors, useOrderService } from "../services/orderService";
import { OrderDoc } from "../types/Order";

export function useOrder(orderId?: string): { order?: OrderDoc } {
  if (orderId) {
    return {
      order: useOrderService(db, orderSelectors.byId(orderId)),
    };
  } else {
    return {
      order: useOrderService(db, orderSelectors.currentPending) ?? undefined,
    };
  }
}

export default function useOrders(): { orders: OrderDoc[] } {
  const newest = useOrderService(db, orderSelectors.newestFirst);
  return { orders: newest };
}
