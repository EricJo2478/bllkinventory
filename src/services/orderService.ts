// src/services/orderService.ts
import {
  Firestore,
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { httpsCallable, Functions } from "firebase/functions";
import { OrderDoc, orderStatus } from "../types/Order";
import { toTimestamp } from "../utils";

// Internal state
type StoreState = {
  status: "idle" | "loading" | "ready" | "error";
  error?: unknown;
  orders: OrderDoc[];
  byId: Map<string, OrderDoc>;
  lastUpdated?: number;
};

// ---------- Internal singleton store ----------
let state: StoreState = { status: "idle", orders: [], byId: new Map() };
let unsub: null | (() => void) = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function start(db: Firestore) {
  if (unsub) return;
  state = { ...state, status: "loading" };
  emit();

  // Prefer sorting by orderDate desc; fallback createdAt desc if you don't set orderDate.
  const q = query(collection(db, "orders"), orderBy("orderDate", "desc"));
  unsub = onSnapshot(
    q,
    (snap) => {
      const orders: OrderDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<OrderDoc, "id">),
      }));
      const byId = new Map(orders.map((o) => [o.id, o]));
      state = { status: "ready", orders, byId, lastUpdated: Date.now() };
      emit();
    },
    (error) => {
      state = { ...state, status: "error", error };
      emit();
    }
  );
}

function stop() {
  if (listeners.size === 0 && unsub) {
    unsub();
    unsub = null;
    state = { ...state, status: "idle" };
  }
}

// ---------- Public subscribe / snapshot ----------
export function subscribeOrders(db: Firestore, cb: () => void) {
  listeners.add(cb);
  start(db);
  return () => {
    listeners.delete(cb);
    stop();
  };
}

export function getOrdersSnapshot(): StoreState {
  return state;
}

// ---------- React hook ----------
export function useOrderService<T = StoreState>(
  db: Firestore,
  selector?: (s: StoreState) => T
): T {
  const get = () =>
    selector
      ? selector(getOrdersSnapshot())
      : (getOrdersSnapshot() as unknown as T);
  return useSyncExternalStore((cb) => subscribeOrders(db, cb), get, get);
}

// ---------- Selectors ----------
export const orderSelectors = {
  all: (s: StoreState) => s.orders,
  status: (s: StoreState) => ({ status: s.status, lastUpdated: s.lastUpdated }),
  byId: (id: string) => (s: StoreState) => s.byId.get(id),
  newestFirst: (s: StoreState) =>
    [...s.orders].sort((a, b) => b.date.toMillis() - a.date.toMillis()),
  byStatus: (status: orderStatus) => (s: StoreState) =>
    s.orders.filter((o) => o.status === status),
  currentPending: (s: StoreState) =>
    s.orders.find((o) => o.status === "pending") ?? null,
  withinRange: (start: Date, end: Date) => (s: StoreState) =>
    s.orders.filter((o) => {
      const t = o.date.toMillis();
      return t >= start.getTime() && t < end.getTime();
    }),
};

// ---------- CRUD helpers ----------
export type CreateOrderInput = {
  orderDate?: Date | Timestamp | string;
  status?: orderStatus; // default 'pending'
  notes?: string | null;
  sessionId?: string | null;
  staffInitials?: string | null;
};

export async function createOrder(db: Firestore, input: CreateOrderInput = {}) {
  const payload: any = {
    status: input.status ?? "pending",
    orderDate: input.orderDate ? toTimestamp(input.orderDate) : null,
    notes: input.notes ?? null,
    sessionId: input.sessionId ?? null,
    staffInitials: input.staffInitials ?? null,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "orders"), payload);
  return ref.id;
}

export type UpdateOrderInput = Partial<{
  orderDate: Date | Timestamp | string | null;
  status: orderStatus;
  notes: string | null;
  // You can set denorms here from server functions as well
  linesCount: number | null;
  totalQuantity: number | null;
  totalItems: number | null;
  sessionId: string | null;
  staffInitials: string | null;
}>;

export async function updateOrder(
  db: Firestore,
  orderId: string,
  input: UpdateOrderInput
) {
  const patch: any = {};
  if ("orderDate" in input)
    patch.orderDate = input.orderDate ? toTimestamp(input.orderDate) : null;
  if ("status" in input) patch.status = input.status;
  if ("notes" in input) patch.notes = input.notes;
  if ("linesCount" in input) patch.linesCount = input.linesCount;
  if ("totalQuantity" in input) patch.totalQuantity = input.totalQuantity;
  if ("totalItems" in input) patch.totalItems = input.totalItems;
  if ("sessionId" in input) patch.sessionId = input.sessionId;
  if ("staffInitials" in input) patch.staffInitials = input.staffInitials;
  patch.updatedAt = serverTimestamp();
  await updateDoc(doc(db, "orders", orderId), patch);
}

export async function setOrderStatus(
  db: Firestore,
  orderId: string,
  status: orderStatus
) {
  await updateDoc(doc(db, "orders", orderId), {
    status,
    submittedAt: status === "ordered" ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOrder(db: Firestore, orderId: string) {
  await deleteDoc(doc(db, "orders", orderId));
}

// ---------- Optional: submit via Cloud Function (server-auth) ----------
export async function submitOrderNow(functions: Functions, orderId: string) {
  const callable = httpsCallable(functions, "submitOrderNow");
  const idempotencyKey = crypto.randomUUID();
  const res = await callable({ orderId, idempotencyKey });
  return res.data;
}
