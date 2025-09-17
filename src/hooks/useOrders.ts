// src/hooks/useOrders.ts

import { useOrderContext } from "../contexts/OrdersContext";

export function useOrders() {
  const { orders, loading, error } = useOrderContext();
  return { orders, loading, error };
}
export function useOrder(id: string) {
  const { getById } = useOrderContext();
  return { med: getById(id) };
}
