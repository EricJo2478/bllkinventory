// src/services/entryService.ts
import {
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  deleteField,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { clampInt, startOfLocalDay, toTimestamp } from "../utils";
import { db } from "./firebase";

export type UpsertEntryInput = {
  date?: Date | Timestamp | string | null; // now optional
  amount: number;
  sessionId?: string | null;
  staffInitials?: string | null;
};

export async function addEntry(medId: string, input: UpsertEntryInput) {
  const payload: any = {
    amount: clampInt(input.amount),
    sessionId: input.sessionId ?? null,
    staffInitials: input.staffInitials ?? null,
    updatedAt: serverTimestamp(),
  };
  if (input.date) {
    payload.date = toTimestamp(input.date);
  }
  const ref = await addDoc(collection(db, "meds", medId, "entries"), payload);
  return ref.id;
}

// ---- Update (partial) ----
export async function updateEntry(
  medId: string,
  entryId: string,
  patch: Partial<UpsertEntryInput>
) {
  const p: any = { updatedAt: serverTimestamp() };
  if ("amount" in patch && patch.amount !== undefined)
    p.amount = clampInt(patch.amount);
  if ("date" in patch) {
    p.date = patch.date === null ? deleteField() : toTimestamp(patch.date!);
  }
  if ("sessionId" in patch) p.sessionId = patch.sessionId ?? null;
  if ("staffInitials" in patch) p.staffInitials = patch.staffInitials ?? null;
  await updateDoc(doc(db, "meds", medId, "entries", entryId), p);
}

// ---- Delete ----
export async function deleteEntry(medId: string, entryId: string) {
  await deleteDoc(doc(db, "meds", medId, "entries", entryId));
}

// ---- Batch add (useful for “submit” or quick receives) ----
export async function batchAddEntries(
  medId: string,
  entries: UpsertEntryInput[]
) {
  if (!entries.length) return;
  const batch = writeBatch(db);
  for (const e of entries) {
    const ref = doc(collection(db, "meds", medId, "entries"));
    batch.set(ref, { ...normalizeInput(e), updatedAt: serverTimestamp() });
  }
  await batch.commit();
}

// ---- Helpers ----
function normalizeInput(input: UpsertEntryInput) {
  return {
    date: toTimestamp(startOfLocalDay(input.date ?? "")),
    amount: clampInt(input.amount),
  };
}

export async function consumeFromEntries(medId: string, qty: number) {
  let remaining = Math.max(0, Math.floor(qty));
  if (remaining === 0) return;

  // Oldest → newest; entries with no date go last (by ordering client-side if needed)
  const q = query(
    collection(db, "meds", medId, "entries"),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);

  const batch = writeBatch(db);

  for (const d of snap.docs) {
    if (remaining <= 0) break;
    const data = d.data() as { amount?: number; date?: any };
    const current = Math.max(0, Math.floor(Number(data.amount ?? 0)));
    if (current <= 0) continue;

    if (current <= remaining) {
      // consume all and delete row
      batch.delete(doc(db, "meds", medId, "entries", d.id));
      remaining -= current;
    } else {
      // partial consume
      batch.update(doc(db, "meds", medId, "entries", d.id), {
        amount: current - remaining,
        updatedAt: serverTimestamp(),
      });
      remaining = 0;
    }
  }

  await batch.commit();
}
