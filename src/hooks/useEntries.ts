// src/hooks/useEntries.ts

import { entrySelectors, useMedEntries } from "../services/entriesService";
import { db } from "../services/firebase";
import { EntryDoc } from "../types/Entry";

export function useEntries(medId: string): { entries: EntryDoc[] } {
  return { entries: useMedEntries(db, medId, entrySelectors.newestFirst) };
}

export function useEntry(medId: string, entryId: string): { entry?: EntryDoc } {
  return { entry: useMedEntries(db, medId, entrySelectors.byId(entryId)) };
}
