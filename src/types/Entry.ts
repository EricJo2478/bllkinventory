// src/types/entryDoc.ts

import { Timestamp } from "firebase/firestore";

export interface EntryDoc {
  id: string;
  amount: number;
  date: Timestamp;
}
