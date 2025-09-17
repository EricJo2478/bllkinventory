// src/hooks/useMeds.ts

import { db } from "../services/firebase";
import { selectors, useMedStore } from "../services/medsService";
import { MedDoc } from "../types/Med";

export function useMed(medId: string): { med?: MedDoc } {
  return { med: useMedStore(db, selectors.byId(medId)) };
}

export default function useMeds(): { meds: MedDoc[] } {
  return { meds: useMedStore(db, selectors.all) };
}
