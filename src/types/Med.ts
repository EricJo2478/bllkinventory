// src/types/medDoc.ts
import { Timestamp } from "firebase/firestore";

export interface MedDoc {
  display: boolean;
  formName: string;
  name: string;
  group: string;
  id: string;
  amount: number;
  entries: EntryDoc[];
  updatedAt: Timestamp;
  aliasOf?: string;
  aliasFactor?: number;
  max?: number;
  min?: number;
  pkg?: number;
}

export interface EntryDoc {
  id: string;
  amount: number;
  date?: Timestamp | null;
  updatedAt: Timestamp;
}
