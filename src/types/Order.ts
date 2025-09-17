// src/types/orderDoc.ts

import { Timestamp } from "firebase/firestore";

export type orderStatus = "pending" | "ordered" | "zeroed" | "received";

export interface OrderDoc {
  id: string;
  status: orderStatus;
  date: Timestamp;
  meds: { id: string; amount: number }[];
}
