// src/types/orderDoc.ts

import { Timestamp } from "firebase/firestore";

export type OrderStatus = "pending" | "ordered" | "zeroed" | "received";

export interface OrderDoc {
  id: string;
  status: OrderStatus;
  date: Timestamp;
  lines: LineDoc[];
  updatedAt: Timestamp;
}

export interface LineDoc {
  id: string;
  quantity: number;
  updatedAt: Timestamp;
}
