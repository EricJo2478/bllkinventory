// src/hooks/useEntries.ts

import { entrySelectors, useMedEntries } from "../services/entriesService";
import { db } from "../services/firebase";

export function useEntries(medId: string) {
  return { entries: useMedEntries(db, medId, entrySelectors.newestFirst) };
}

export function useEntry(medId: string, entryId: string) {
  return { entries: useMedEntries(db, medId, entrySelectors.byId(entryId)) };
}
