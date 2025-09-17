// src/services/orderService.ts
import {
  Firestore,
  Timestamp,
  serverTimestamp,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { Functions, httpsCallable } from "firebase/functions";
import type { OrderStatus, OrderDoc } from "../types/Order"; // adjust path if needed
// If you have a monday() helper, import it (optional)
import { monday, toTimestamp, monday as utilsMonday } from "../utils"; // remove if you don't have it
import { db } from "./firebase";

// -------- Types --------
export type UpsertOrderInput = Partial<Pick<OrderDoc, "status">> & {
  date?: Date | Timestamp | string | null;
};

// Find a single pending order (or null). No create.
export async function findPendingOrderId(): Promise<string | null> {
  const q = query(
    collection(db, "orders"),
    where("status", "==", "pending"),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

// ---------- Create / Ensure ----------
export async function createOrder(db: Firestore, input: UpsertOrderInput = {}) {
  const payload: Omit<OrderDoc, "id"> = {
    status: (input.status as OrderStatus) ?? "pending",
    // use provided date, or next Monday, or null if you don't want a date
    date: input.date == null ? toTimestamp(monday()) : toTimestamp(input.date),
    updatedAt: serverTimestamp() as unknown as Timestamp,
  } as any;

  const ref = await addDoc(collection(db, "orders"), payload);
  return ref.id;
}

/** Find the single pending order or create one for the upcoming Monday. */
export async function ensurePendingOrder(db: Firestore): Promise<string> {
  const ref = collection(db, "orders");
  const q = query(ref, where("status", "==", "pending"), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;
  return await createOrder(db, { status: "pending" });
}

// ---------- Update / Status / Delete ----------
export async function updateOrder(
  db: Firestore,
  orderId: string,
  patch: UpsertOrderInput
) {
  const p: any = { ...patch, updatedAt: serverTimestamp() };
  if ("date" in p && p.date != null) p.date = toTimestamp(p.date);
  await updateDoc(doc(db, "orders", orderId), p);
}

export async function setOrderStatus(
  db: Firestore,
  orderId: string,
  status: OrderStatus
) {
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ---------- Submit (Callable + idempotency) ----------
export async function submitOrderNow(functions: Functions, orderId: string) {
  const callable = httpsCallable(functions, "submitOrderNow");
  const idempotencyKey = crypto.randomUUID();
  const res = await callable({ orderId, idempotencyKey });
  return res.data as { ok: boolean; submissionId?: string; reason?: string };
}
