// src/services/lineService.ts
import {
  Firestore,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  writeBatch,
  getDocs,
  collection,
} from "firebase/firestore";
import { db } from "./firebase";
import { clampInt } from "../utils";

export type AddLineInput = {
  medId: string;
  quantity: number;
};

// ---- Create / Increment (no read needed) ----
/** Create or bump a line (doc id = medId). Uses increment() to avoid reads. */
export async function addLine(orderId: string, input: AddLineInput) {
  const qty = clampInt(input.quantity ?? 1);
  if (qty <= 0) return;
  const lineRef = doc(db, "orders", orderId, "lines", input.medId);

  await setDoc(
    lineRef,
    {
      medId: input.medId,
      quantity: increment(qty),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Optional: touch parent order.updatedAt here if you want list sorting by freshness
  // await updateDoc(doc(db, "orders", orderId), { updatedAt: serverTimestamp() });
}

/** Increment/decrement quantity by delta (negative allowed). */
export async function incrementLine(
  orderId: string,
  medId: string,
  delta: number
) {
  const d = clampInt(delta);
  if (d === 0) return;
  const lineRef = doc(db, "orders", orderId, "lines", medId);
  await updateDoc(lineRef, {
    quantity: increment(d),
    updatedAt: serverTimestamp(),
  });
}

// ---- Absolute set (with optional prev for no-read delta) ----
/** Set absolute quantity. If you pass prevQty, we compute a delta to avoid a read. */
export async function setLineQuantity(
  orderId: string,
  medId: string,
  nextQty: number,
  prevQty?: number
) {
  const n = clampInt(nextQty);
  const lineRef = doc(db, "orders", orderId, "lines", medId);

  if (n <= 0) {
    // zero or less → delete line
    await deleteDoc(lineRef);
    return;
  }

  if (typeof prevQty === "number") {
    const delta = n - clampInt(prevQty);
    if (delta === 0) return;
    await setDoc(
      lineRef,
      { quantity: increment(delta), updatedAt: serverTimestamp() },
      { merge: true }
    );
    return;
  }

  // no prev → direct set (creates or overwrites)
  await setDoc(
    lineRef,
    { medId, quantity: n, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ---- Delete ----
export async function deleteLine(orderId: string, medId: string) {
  await deleteDoc(doc(db, "orders", orderId, "lines", medId));
}

// ---- Batch adds (e.g., from Submit page) ----
/** Add many medId->qty pairs in one batch (increments, no reads). */
export async function batchAddLines(
  orderId: string,
  items: Record<string, number>
) {
  const batch = writeBatch(db);
  const orderRef = doc(db, "orders", orderId);

  Object.entries(items).forEach(([medId, qtyRaw]) => {
    const qty = clampInt(qtyRaw);
    if (qty <= 0) return;
    const lineRef = doc(db, "orders", orderId, "lines", medId);
    batch.set(
      lineRef,
      {
        medId,
        quantity: increment(qty),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  // optional: touch parent order.updatedAt
  batch.set(orderRef, { updatedAt: serverTimestamp() }, { merge: true });

  await batch.commit();
}

export async function getLinesMapForOrder(orderId: string) {
  const m = new Map<string, number>();
  const snap = await getDocs(collection(db, "orders", orderId, "lines"));
  snap.forEach((d) => {
    const { quantity } = d.data() as { quantity?: number };
    const q = Math.floor(quantity ?? 0);
    if (q > 0) m.set(d.id, (m.get(d.id) ?? 0) + q);
  });
  return m;
}
