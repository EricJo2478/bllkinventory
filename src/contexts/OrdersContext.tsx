import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase";
import type { OrderDoc, LineDoc, OrderStatus } from "../types/Order";
import useAuth from "../hooks/useAuth";

interface OrderContextValue {
  orders: OrderDoc[];
  getById: (medId: string) => OrderDoc | undefined;
  loading: boolean;
  error?: unknown;
}
const OrderContext = createContext<OrderContextValue | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  // raw orders (no lines)
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  // lines grouped by medId
  const [linesByOrder, setLinesByOrder] = useState<Map<string, LineDoc[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);
  const { loading: authLoading } = useAuth();

  // 1) orders listener
  useEffect(() => {
    if (authLoading) return;
    const cutoff = Timestamp.fromDate(
      new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    );
    const q = query(
      collection(db, "orders"),
      where("date", ">=", cutoff),
      orderBy("date", "desc")
    );
    // const q = query(collection(db, "orders"), orderBy("date"));
    const unsub = onSnapshot(q, {
      next: (snap) => {
        const next: OrderDoc[] = snap.docs.map((d) => {
          const data = d.data() as Omit<OrderDoc, "id">;
          return {
            id: d.id,
            ...data,
            status: data.status.toLocaleLowerCase() as OrderStatus,
          };
        });
        setOrders(next);
        setLoading(false);
      },
      error: (err) => {
        console.error("[OrderProvider] orders onSnapshot error:", err);
        setError(err);
        setOrders([]);
        setLoading(false);
      },
    });
    return () => unsub();
  }, [authLoading]);

  // 2) lines listener (ALL orders) — group by parent medId
  useEffect(() => {
    if (authLoading) return;
    const q = query(collectionGroup(db, "lines"));
    const unsub = onSnapshot(q, {
      next: (snap) => {
        const map = new Map<string, LineDoc[]>();
        snap.forEach((docSnap) => {
          const line = {
            id: docSnap.id,
            ...(docSnap.data() as Omit<LineDoc, "id">),
          };
          // parent path: orders/{orderId}/lines
          const orderId = docSnap.ref.parent.parent?.id;
          if (!orderId) return;
          const arr = map.get(orderId);
          if (arr) arr.push(line);
          else map.set(orderId, [line]);
        });
        setLinesByOrder(map);
      },
      error: (err) => {
        console.error("[OrderProvider] lines onSnapshot error:", err);
        setError(err);
      },
    });
    return () => unsub();
  }, [authLoading]);

  // 3) merge: orders + lines
  const ordersWithLines: OrderDoc[] = useMemo(() => {
    if (!orders.length && linesByOrder.size === 0) return [];
    return orders.map((m) => ({
      ...m,
      lines: linesByOrder.get(m.id) ?? [],
    }));
  }, [orders, linesByOrder]);

  // 4) byId lookup for merged objects
  const byId = useMemo(
    () => new Map(ordersWithLines.map((m) => [m.id, m])),
    [ordersWithLines]
  );
  const getById = useCallback((id: string) => byId.get(id), [byId]);

  const value = useMemo<OrderContextValue>(
    () => ({ orders: ordersWithLines, getById, loading, error }),
    [ordersWithLines, getById, loading, error]
  );

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

export function useOrderContext(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx)
    throw new Error("useOrderContext must be used inside <OrderProvider>");
  return ctx;
}
