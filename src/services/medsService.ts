// useMeds.ts
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Firestore,
} from "firebase/firestore";
import { useSyncExternalStore, useMemo } from "react";
import { MedDoc } from "../types/Med";

type StoreState = {
  meds: MedDoc[];
  byId: Map<string, MedDoc>;
  status: "idle" | "loading" | "ready" | "error";
  error?: unknown;
  lastUpdated?: number; // Date.now()
};

let state: StoreState = { meds: [], byId: new Map(), status: "idle" };
let stopFirestore: null | (() => void) = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function start(db: Firestore) {
  if (stopFirestore) return;
  state = { ...state, status: "loading" };
  emit();

  const q = query(collection(db, "meds"), orderBy("group"), orderBy("name"));
  stopFirestore = onSnapshot(q, {
    next: (snap) => {
      const meds: MedDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MedDoc, "id">),
      }));
      const byId = new Map(meds.map((m) => [m.id, m]));
      state = { meds, byId, status: "ready", lastUpdated: Date.now() };
      emit();
    },
    error: (err) => {
      state = { ...state, status: "error", error: err };
      emit();
    },
  });
}

function stop() {
  if (stopFirestore && listeners.size === 0) {
    stopFirestore();
    stopFirestore = null;
    state = { ...state, status: "idle" };
  }
}

export function subscribe(db: Firestore, cb: () => void) {
  listeners.add(cb);
  start(db);
  return () => {
    listeners.delete(cb);
    stop();
  };
}

export function getSnapshot(): StoreState {
  return state;
}

export function getMeds(): MedDoc[] {
  return state.meds;
}

export function getMed(id: string): MedDoc | null {
  return state.byId.get(id) ?? null;
}

// React-facing hook with selector
export function useMedStore<T = StoreState>(
  db: Firestore,
  selector?: (s: StoreState) => T,
  equals?: (a: T, b: T) => boolean
): T {
  const get = () =>
    selector ? selector(getSnapshot()) : (getSnapshot() as unknown as T);
  const subscribeFn = (cb: () => void) => subscribe(db, cb);
  // Stable compare to avoid useless renders when selecting slices
  const selected = useSyncExternalStore(subscribeFn, get, get);
  // Optional shallow equality for derived objects
  return equals ? useMemo(() => selected, [selected]) : selected;
}

// tiny helper for common selectors
export const selectors = {
  all: (s: StoreState) => s.meds,
  byId: (id: string) => (s: StoreState) => s.byId.get(id),
  status: (s: StoreState) => ({ status: s.status, lastUpdated: s.lastUpdated }),
};
