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
  runTransaction,
  where,
  setDoc,
} from "firebase/firestore";
import {
  clampInt,
  startOfLocalDay,
  toDateKeyISO,
  toLocalMidnight,
  toTimestamp,
} from "../utils";
import { db } from "./firebase";

export type UpsertEntryInput = {
  date?: Date | Timestamp | string | null; // now optional
  amount: number;
};

export async function addEntry(medId: string, input: UpsertEntryInput) {
  const payload: any = {
    amount: clampInt(input.amount),
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

/**
 * Add or increment an entry for a given expiry date.
 * - If an entry exists with the same `date` (normalized) => increment its amount
 * - Otherwise create a new entry
 */
export async function addOrIncrementEntry(
  medId: string,
  opts: {
    date?: Date | string | Timestamp | null;
    amount: number;
    staffInitials?: string | null;
  }
) {
  const amount = Math.max(0, Math.floor(opts.amount ?? 0));
  if (amount <= 0) return;

  // When date is omitted/null, just create a new row (or you can also merge null-dated entries—see note below)
  if (!opts.date) {
    await addDoc(collection(db, "meds", medId, "entries"), {
      amount,
      date: null,
      staffInitials: opts.staffInitials ?? null,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const midnight = toLocalMidnight(opts.date) as Date;
  const ts = Timestamp.fromDate(midnight);

  await runTransaction(db, async (tx) => {
    const coll = collection(db, "meds", medId, "entries");
    // Exact Timestamp equality works, as long as you always normalize to midnight
    const snap = await getDocs(query(coll, where("date", "==", ts)));

    if (!snap.empty) {
      // increment the first match (you can decide to merge all matches if duplicates exist)
      const docRef = snap.docs[0].ref;
      const current = Math.max(
        0,
        Math.floor(Number(snap.docs[0].data().amount ?? 0))
      );
      tx.update(docRef, {
        amount: current + amount,
        updatedAt: serverTimestamp(),
      });
    } else {
      const newRef = doc(coll); // pre-create id so we can use tx.set if you prefer
      tx.set(newRef, {
        amount,
        date: ts,
        staffInitials: opts.staffInitials ?? null,
        updatedAt: serverTimestamp(),
      });
    }
  });
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

function datedEntryRef(medId: string, d: Date) {
  const key = toDateKeyISO(d);
  return doc(db, "meds", medId, "entries", key);
}

/**
 * Move an entry's date (and effectively its document) safely.
 *
 * - If `toDate` is a Date/Timestamp/string → moves/merges into deterministic id `entries/YYYY-MM-DD`.
 * - If `toDate` is null/undefined → moves into a NEW undated auto-ID doc (keeps multiple undated entries).
 * - If merging into an existing dated doc, amounts are added together.
 * - Source doc is deleted at the end (atomic via transaction).
 *
 * @param medId        parent medication id
 * @param fromEntryId  current entry doc id (can be deterministic "YYYY-MM-DD" or an auto-ID)
 * @param toDate       new date (`Date` | `Timestamp` | ISO string) or `null` for undated
 */
export async function moveEntryDate(
  medId: string,
  fromEntryId: string,
  toDate: Date | string | Timestamp | null | undefined
) {
  const fromRef = doc(db, "meds", medId, "entries", fromEntryId);

  await runTransaction(db, async (tx) => {
    const fromSnap = await tx.get(fromRef);
    if (!fromSnap.exists()) return;

    const data = fromSnap.data() as {
      amount?: number;
      date?: Timestamp | null;
      staffInitials?: string | null;
      sessionId?: string | null;
    };

    const amount = Math.max(0, Math.floor(Number(data.amount ?? 0)));
    const staffInitials = data.staffInitials ?? null;
    const sessionId = data.sessionId ?? null;

    // If nothing to move, just delete (or early return).
    if (amount <= 0) {
      tx.delete(fromRef);
      return;
    }

    const targetDate = toLocalMidnight(toDate ?? null);

    if (targetDate) {
      // DATED TARGET: upsert/merge into deterministic doc id
      const toRef = datedEntryRef(medId, targetDate);
      const toSnap = await tx.get(toRef);

      if (toSnap.exists()) {
        const prev = Math.max(
          0,
          Math.floor(Number(toSnap.data()?.amount ?? 0))
        );
        tx.set(
          toRef,
          {
            amount: prev + amount,
            date: Timestamp.fromDate(targetDate),
            // keep existing staffInitials/sessionId in the target (don't overwrite),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // New dated doc: carry over staff/session
        tx.set(toRef, {
          amount,
          date: Timestamp.fromDate(targetDate),
          staffInitials,
          sessionId,
          updatedAt: serverTimestamp(),
        });
      }

      // Remove the old doc
      tx.delete(fromRef);
      return;
    }

    // UNDATED TARGET: create a NEW auto-ID doc (allow multiple undated entries)
    const newUndatedRef = doc(collection(db, "meds", medId, "entries"));
    tx.set(newUndatedRef, {
      amount,
      date: null,
      staffInitials,
      sessionId,
      updatedAt: serverTimestamp(),
    });

    // Remove the old doc
    tx.delete(fromRef);
  });
}
/** Set an exact amount for an entry row.
 * - For dated rows (id = "YYYY-MM-DD"), also keeps the `date` field aligned (local midnight).
 * - For undated auto-ID rows, prefer `updateEntry` (EntryField already does that).
 */
export async function setEntryAmount(
  medId: string,
  entryId: string, // "YYYY-MM-DD" for dated deterministic rows
  amount: number
) {
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  const ref = doc(db, "meds", medId, "entries", entryId);
  const isDated = /^\d{4}-\d{2}-\d{2}$/.test(entryId);

  await setDoc(
    ref,
    {
      amount: amt,
      ...(isDated
        ? { date: Timestamp.fromDate(toLocalMidnight(entryId) as Date) }
        : {}), // undated rows shouldn't hit this path in normal UI
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
