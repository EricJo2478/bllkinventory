// src/services/entriesService.ts
import {
  Firestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { EntryDoc } from "../types/Entry";

type StoreState = {
  status: "idle" | "loading" | "ready" | "error";
  error?: unknown;
  entries: EntryDoc[];
  byId: Map<string, EntryDoc>;
  lastUpdated?: number;
};

// ---------- Internal per-med store ----------
type InternalStore = {
  state: StoreState;
  listeners: Set<() => void>;
  unsub?: () => void;
  refCount: number; // number of React subscribers across the app
};

const stores = new Map<string, InternalStore>();

function getDefaultState(): StoreState {
  return { status: "idle", entries: [], byId: new Map() };
}

function getStore(medId: string): InternalStore {
  let s = stores.get(medId);
  if (!s) {
    s = { state: getDefaultState(), listeners: new Set(), refCount: 0 };
    stores.set(medId, s);
  }
  return s;
}

function emit(medId: string) {
  const s = stores.get(medId);
  if (!s) return;
  s.listeners.forEach((cb) => cb());
}

function start(db: Firestore, medId: string) {
  const s = getStore(medId);
  if (s.unsub) return; // already running

  s.state = { ...s.state, status: "loading" };
  emit(medId);

  const q = query(
    collection(db, "meds", medId, "entries"),
    // sort by date ascending; change to "desc" if you prefer newest first
    orderBy("date", "asc")
  );

  s.unsub = onSnapshot(
    q,
    (snap) => {
      const entries: EntryDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<EntryDoc, "id">),
      }));
      const byId = new Map(entries.map((e) => [e.id, e]));
      s.state = {
        status: "ready",
        entries,
        byId,
        lastUpdated: Date.now(),
      };
      emit(medId);
    },
    (error) => {
      s.state = { ...s.state, status: "error", error };
      emit(medId);
    }
  );
}

function stop(medId: string) {
  const s = stores.get(medId);
  if (!s) return;
  if (s.refCount === 0 && s.unsub) {
    s.unsub();
    s.unsub = undefined;
    s.state = { ...s.state, status: "idle" };
  }
}

// ---------- Public subscribe / snapshot ----------
export function subscribeEntries(db: Firestore, medId: string, cb: () => void) {
  if (!medId) throw new Error("subscribeEntries: medId is required");
  const s = getStore(medId);
  s.listeners.add(cb);
  s.refCount++;
  start(db, medId);
  return () => {
    s.listeners.delete(cb);
    s.refCount = Math.max(0, s.refCount - 1);
    stop(medId);
  };
}

export function getEntriesSnapshot(medId: string): StoreState {
  return getStore(medId).state;
}

// ---------- React hook with selector ----------
export function useMedEntries<T = StoreState>(
  db: Firestore,
  medId: string,
  selector?: (s: StoreState) => T
): T {
  const get = () =>
    selector
      ? selector(getEntriesSnapshot(medId))
      : (getEntriesSnapshot(medId) as unknown as T);
  return useSyncExternalStore(
    (cb) => subscribeEntries(db, medId, cb),
    get,
    get // serversnapshot (SSR) same as client
  );
}

// ---------- Selectors ----------
export const entrySelectors = {
  all: (s: StoreState) => s.entries,
  status: (s: StoreState) => ({ status: s.status, lastUpdated: s.lastUpdated }),
  byId: (id: string) => (s: StoreState) => s.byId.get(id),
  // Derived helpers:
  newestFirst: (s: StoreState) =>
    [...s.entries].sort((a, b) => b.date.toMillis() - a.date.toMillis()),
  totalAmount: (s: StoreState) =>
    s.entries.reduce((sum, e) => sum + (e.amount || 0), 0),
};

// ---------- CRUD helpers (safe, minimal) ----------
export type UpsertEntryInput = {
  date: Date | Timestamp | string; // normalized to start-of-day
  amount: number;
  sessionId?: string | null;
  staffInitials?: string | null;
};

export async function addEntry(
  db: Firestore,
  medId: string,
  input: UpsertEntryInput
) {
  const payload = normalizeInput(input);
  const ref = await addDoc(collection(db, "meds", medId, "entries"), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEntry(
  db: Firestore,
  medId: string,
  entryId: string,
  input: Partial<UpsertEntryInput>
) {
  const partial: any = {};
  if (input.date !== undefined)
    partial.date = toTimestamp(normalizeToLocalStartOfDay(input.date));
  if (input.amount !== undefined) partial.amount = clampAmount(input.amount);
  if (input.sessionId !== undefined) partial.sessionId = input.sessionId;
  if (input.staffInitials !== undefined)
    partial.staffInitials = input.staffInitials;
  partial.updatedAt = serverTimestamp();
  await updateDoc(doc(db, "meds", medId, "entries", entryId), partial);
}

export async function deleteEntry(
  db: Firestore,
  medId: string,
  entryId: string
) {
  await deleteDoc(doc(db, "meds", medId, "entries", entryId));
}

// ---------- Data hygiene ----------
function normalizeInput(input: UpsertEntryInput) {
  return {
    date: toTimestamp(normalizeToLocalStartOfDay(input.date)),
    amount: clampAmount(input.amount),
    sessionId: input.sessionId ?? null,
    staffInitials: input.staffInitials ?? null,
  };
}

function clampAmount(n: number) {
  // If you truly need decimals, change Math.max(0, n) and remove Math.round
  return Math.max(0, Math.round(n));
}

function normalizeToLocalStartOfDay(d: Date | Timestamp | string): Date {
  const date =
    d instanceof Timestamp
      ? d.toDate()
      : typeof d === "string"
      ? new Date(d)
      : d;
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toTimestamp(d: Date): Timestamp {
  return Timestamp.fromDate(d);
}
