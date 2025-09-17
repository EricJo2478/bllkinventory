// src/types/orderDoc.ts

export type orderStatus = "pending" | "ordered" | "zeroed" | "received";

export interface OrderDoc {
  id: string;
  status: orderStatus;
  date: Date;
  meds: { id: string; amount: number }[];
}
