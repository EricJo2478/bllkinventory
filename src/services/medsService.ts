// src/services/medsService.ts
import {
  Timestamp,
  serverTimestamp,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  limit,
} from "firebase/firestore";
import { MedDoc } from "../types/Med";
import { db } from "./firebase";
import { clampInt } from "../utils";

export type CreateMedInput = Omit<MedDoc, "id" | "updatedAt"> & {
  display?: boolean;
};
export type UpdateMedInput = Partial<Omit<MedDoc, "id" | "updatedAt">>;

// ---- Create ----
export async function createMed({
  name,
  formName,
  group,
  pkg,
  aliasOf,
  display,
  amount,
}: CreateMedInput): Promise<string> {
  const payload: Omit<MedDoc, "id"> = {
    name: name.trim(),
    formName: formName?.trim() ?? undefined,
    group: group?.trim() ?? undefined,
    pkg: normalizePkg(pkg),
    aliasOf: aliasOf ?? undefined,
    display: display ?? true,
    amount: amount ?? undefined,
    updatedAt: serverTimestamp() as unknown as Timestamp,
    entries: [],
  };
  const ref = await addDoc(collection(db, "meds"), payload);
  return ref.id;
}

// ---- Update (partial) ----
export async function updateMed(medId: string, patch: UpdateMedInput) {
  const p: any = { ...patch, updatedAt: serverTimestamp() };
  if ("name" in p && typeof p.name === "string") p.name = p.name.trim();
  if ("formName" in p && typeof p.formName === "string")
    p.formName = p.formName.trim();
  if ("group" in p && typeof p.group === "string") p.group = p.group.trim();
  if ("packSize" in p) p.packSize = normalizePkg(p.packSize);
  if ("aliasOf" in p && p.aliasOf === undefined) p.aliasOf = null;
  if ("display" in p && p.display === undefined) p.display = true;
  await updateDoc(doc(db, "meds", medId), p);
}

// ---- Delete (safe) ----
// Fails if the med still has any entries unless force=true.
export async function deleteMed(medId: string, opts?: { force?: boolean }) {
  if (!opts?.force) {
    const snap = await getDocs(collection(db, "meds", medId, "entries"));
    if (!snap.empty) {
      throw new Error(
        "Cannot delete med with existing entries. Pass { force: true } to override."
      );
    }
  }
  await deleteDoc(doc(db, "meds", medId));
}

// ---- Small helpers ----
function normalizePkg(n?: number) {
  if (n == null) return undefined;
  return clampInt(n);
}
