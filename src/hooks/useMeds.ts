// src/hooks/useMeds.ts

import { useMedContext } from "../contexts/MedsContext";

export function useMeds() {
  const { meds, loading, error } = useMedContext();
  return { meds, loading, error };
}
export function useMed(id: string) {
  const { getById } = useMedContext();
  return { med: getById(id) };
}
