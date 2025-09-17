// src/services/orderingService.ts
import {
  Firestore,
  Timestamp,
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  collectionGroup,
} from "firebase/firestore";
import { ensurePendingOrder, findPendingOrderId } from "./orderService";
import { batchAddLines, getLinesMapForOrder } from "./lineService";
import { OrderStatus } from "../types/Order";
import { MedDoc } from "../types/Med";
import { clampInt, expiryDay } from "../utils";
import { db } from "./firebase";

export type PredictOptions = {
  // Entries that expire before this cutoff are ignored for on-hand
  cutoffDate?: Date;
  // Which order statuses count as "on order"
  statusesCountedAsOnOrder?: OrderStatus[];
};

// ---------- core math ----------
export function computeEffectiveOnHand(med: MedDoc, cutoff: Date): number {
  if (!med.entries?.length) return 0;
  const cutMs = cutoff.getTime();
  return med.entries.reduce((sum, e) => {
    const t = e.date?.toMillis?.() ?? 0;
    return t >= cutMs ? sum + (e.amount || 0) : sum;
  }, 0);
}

export function computeAutoOrderQty(
  min: number | null | undefined,
  max: number | null | undefined,
  pkg: number | null | undefined,
  onHand: number,
  onOrder: number
): number {
  const Min = clampInt(min, 0);
  const Max = clampInt(max, 0);
  const Pkg = clampInt(pkg, 0);
  const available = onHand + onOrder;

  if (Max <= 0) return 0; // no max configured ⇒ skip
  if (Pkg <= 0) return 0; // no pkg configured ⇒ skip
  if (available > Min) return 0; // doesn’t breach min ⇒ no order

  const deficit = Max - available;
  if (deficit <= 0) return 0;

  // Don’t exceed Max; packages only.
  const packs = Math.floor(deficit / Pkg);
  return Math.max(0, packs * Pkg);
}

// ---------- read helpers  ----------
// Map of medId -> qty in the given pending order
export async function getPendingLinesMap(pendingOrderId: string) {
  const m = new Map<string, number>();
  const snap = await getDocs(collection(db, "orders", pendingOrderId, "lines"));
  snap.forEach((d) => {
    const { quantity } = d.data() as { quantity?: number };
    if (quantity && quantity > 0)
      m.set(d.id, (m.get(d.id) ?? 0) + Math.floor(quantity));
  });
  return m;
}

// Optional: if you also want to count "ordered" (still incoming) across *all* orders,
// the easiest scalable path is to denormalize parent orderStatus into each line doc.
export async function getLinesMapForOrdersWithStatuses(
  statuses: OrderStatus[]
) {
  const orderIds: string[] = [];
  const ordersSnap = await getDocs(
    query(collection(db, "orders"), where("status", "in", statuses))
  );
  ordersSnap.forEach((d) => orderIds.push(d.id));

  const m = new Map<string, number>();
  for (const id of orderIds) {
    const lines = await getLinesMapForOrder(id);
    lines.forEach((qty, medId) => m.set(medId, (m.get(medId) ?? 0) + qty));
  }
  return m;
}

// ---------- main: predict + upsert into pending ----------
/**
 * Given meds (with entries already attached), compute what *Monday’s auto system*
 * would order, then ensure a pending order exists and add only the *delta* needed
 * so that pending == predicted (no double counting).
 *
 * By default, on_order counts the *current pending order* lines; if you also want
 * to count other open orders, pass a second map via `openLines`.
 */

const ONE = 1;

/** Return the canonical id for a med (itself if not an alias). */
function canonicalId(m: MedDoc) {
  return m.aliasOf ?? m.id;
}

/** Build a map of canonicalId -> effective on-hand (including aliases). */
function rollupOnHand(meds: MedDoc[], cutoff: Date) {
  const map = new Map<string, number>();
  for (const m of meds) {
    const key = canonicalId(m);
    const factor =
      Number.isFinite(m.aliasFactor as any) && (m.aliasFactor as any)! > 0
        ? (m.aliasFactor as number)
        : ONE;
    const onHand = computeEffectiveOnHand(m, cutoff) * factor;
    map.set(key, (map.get(key) ?? 0) + onHand);
  }
  return map;
}

/** True if this med is canonical (i.e., can be directly ordered). */
function isCanonical(m: MedDoc) {
  return !m.aliasOf;
}

export async function buildAutoOrderPreview(
  meds: MedDoc[],
  opts: PredictOptions = {}
) {
  const cutoff = opts.cutoffDate ?? expiryDay();
  const statuses = opts.statusesCountedAsOnOrder ?? ["pending"];

  const pendingId = await findPendingOrderId();
  const pendingMap = pendingId
    ? await getLinesMapForOrder(pendingId)
    : new Map<string, number>();

  const onOrderMap =
    statuses.length === 1 && statuses[0] === "pending"
      ? pendingMap
      : await getLinesMapForOrdersWithStatuses(statuses);

  // 🔑 NEW: sum on-hand by canonical id (aliases contribute to their canonical)
  const onHandRollup = rollupOnHand(meds, cutoff);

  // Predict ONLY for canonical meds; use that med’s min/max/pkg
  const predicted = new Map<string, number>(); // key = canonical medId
  for (const m of meds) {
    if (!isCanonical(m)) continue; // skip aliases as order targets
    const onHand = onHandRollup.get(m.id) ?? 0;
    const onOrder = onOrderMap.get(m.id) ?? 0;
    const qty = computeAutoOrderQty(m.min, m.max, m.pkg, onHand, onOrder);
    if (qty > 0) predicted.set(m.id, qty);
  }

  // As before: compute delta vs pending and a combined preview
  const delta = new Map<string, number>();
  predicted.forEach((want, medId) => {
    const have = pendingMap.get(medId) ?? 0;
    const inc = want - have;
    if (inc > 0) delta.set(medId, inc);
  });

  const combined = new Map<string, number>();
  const setMax = (k: string, v: number) =>
    combined.set(k, Math.max(0, Math.floor(v)));
  pendingMap.forEach((v, k) => setMax(k, v));
  delta.forEach((v, k) => setMax(k, (combined.get(k) ?? 0) + v));
  predicted.forEach((v, k) => {
    if (!combined.has(k)) setMax(k, v);
  });

  return {
    pendingOrderId: pendingId,
    pending: pendingMap, // medId (canonical) -> qty in pending
    predicted, // medId (canonical) -> predicted total
    delta, // medId (canonical) -> would add
    combined, // medId (canonical) -> for display
    cutoff,
    // Optional debug: onHandRollup
  };
}
