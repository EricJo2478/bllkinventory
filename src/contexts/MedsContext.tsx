import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../services/firebase";
import type { MedDoc, EntryDoc } from "../types/Med";
import useAuth from "../hooks/useAuth";
import {
  createMed,
  CreateMedInput,
  deleteMed,
  updateMed,
  UpdateMedInput,
} from "../services/medsService";
import {
  addEntry,
  deleteEntry,
  updateEntry,
  UpsertEntryInput,
} from "../services/entryService";

interface MedContextValue {
  meds: MedDoc[];
  getById: (medId: string) => MedDoc | undefined;
  loading: boolean;
  error?: unknown;
}
async function withPath<T>(label: string, fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e: any) {
    console.error(`[perm] ${label} failed:`, e?.code, e?.message);
    throw e;
  }
}
const MedContext = createContext<MedContextValue | undefined>(undefined);

export function MedProvider({ children }: { children: ReactNode }) {
  // raw meds (no entries)
  const [meds, setMeds] = useState<MedDoc[]>([]);
  // entries grouped by medId
  const [entriesByMed, setEntriesByMed] = useState<Map<string, EntryDoc[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);
  const { loading: authLoading } = useAuth();

  // 1) meds listener
  useEffect(() => {
    if (authLoading) return;
    const q = query(collection(db, "meds"), orderBy("group"), orderBy("name"));
    const unsub = onSnapshot(q, {
      next: (snap) => {
        const next: MedDoc[] = snap.docs.map((d) => {
          const data = d.data() as Omit<MedDoc, "id">;
          return { id: d.id, ...data, display: (data as any).display ?? true };
        });
        setMeds(next);
        setLoading(false);
      },
      error: (err) => {
        console.error("[MedProvider] meds onSnapshot error:", err);
        setError(err);
        setMeds([]);
        setLoading(false);
      },
    });
    return () => unsub();
  }, [authLoading]);

  // 2) entries listener (ALL meds) — group by parent medId
  useEffect(() => {
    if (authLoading) return;

    // ⬅️ No orderBy("date") — otherwise docs without `date` are excluded.
    const q = query(collectionGroup(db, "entries"));

    const unsub = onSnapshot(q, {
      next: (snap) => {
        const map = new Map<string, EntryDoc[]>();

        snap.forEach((docSnap) => {
          const raw = docSnap.data() as any;

          // Let date be optional/null; don't assume it exists
          const entry: EntryDoc = {
            id: docSnap.id,
            ...raw, // may or may not include `date`
          };

          // parent path: meds/{medId}/entries/{entryId}
          const medId = docSnap.ref.parent.parent?.id;
          if (!medId) return;

          const arr = map.get(medId);
          if (arr) arr.push(entry);
          else map.set(medId, [entry]);
        });

        // Stable sort: oldest → newest; items with no date go last
        for (const [k, arr] of map) {
          arr.sort((a, b) => {
            const ta = a?.date?.toMillis?.() ?? Number.POSITIVE_INFINITY;
            const tb = b?.date?.toMillis?.() ?? Number.POSITIVE_INFINITY;
            return ta - tb;
          });
          map.set(k, arr);
        }

        setEntriesByMed(map);
      },
      error: (err) => {
        console.error("[MedProvider] entries onSnapshot error:", err);
        setError(err);
      },
    });

    return () => unsub();
  }, [authLoading]);
  // 3) merge: meds + entries
  const medsWithEntries: MedDoc[] = useMemo(() => {
    if (!meds.length && entriesByMed.size === 0) return [];
    return meds.map((m) => ({
      ...m,
      entries: entriesByMed.get(m.id) ?? [],
    }));
  }, [meds, entriesByMed]);

  // 4) byId lookup for merged objects
  const byId = useMemo(
    () => new Map(medsWithEntries.map((m) => [m.id, m])),
    [medsWithEntries]
  );

  const getById = useCallback((id: string) => byId.get(id), [byId]);

  const value = useMemo<MedContextValue>(
    () => ({ meds: medsWithEntries, getById, loading, error }),
    [medsWithEntries, getById, loading, error]
  );

  return <MedContext.Provider value={value}>{children}</MedContext.Provider>;
}

export function useMedContext(): MedContextValue {
  const ctx = useContext(MedContext);
  if (!ctx) throw new Error("useMedContext must be used inside <MedProvider>");
  return ctx;
}
