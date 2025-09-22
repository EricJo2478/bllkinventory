// src/utils.ts

import { Timestamp } from "firebase/firestore";

// date constants
export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const expiryDay = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(0, 0, 0, 0);
  return d;
};
export const monday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
};

// execute an async function with handling to retry up to 3 times at 1 sec intervals when getting a netword error
export async function functionNetworkRetry<T>(
  operationFunction: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const result = await operationFunction();
      return result; // Success
    } catch (error: any) {
      if (error.code === "unavailable" || error.code === "deadline-exceeded") {
        // Network error handling
        console.warn(
          `Firestore operation failed (retry ${retries + 1}/${maxRetries}):`,
          error.message
        );
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, retries))
        ); // Exponential backoff
        retries++;
      } else {
        throw error; // Re-throw unhandled errors
      }
    }
  }
  throw new Error(`Firestore operation failed after ${maxRetries} retries.`); // too many tries
}

export function toTimestamp(d: Date | Timestamp | string): Timestamp {
  if (d instanceof Timestamp) return d;
  const date = typeof d === "string" ? new Date(d) : d;
  return Timestamp.fromDate(date);
}

export function clampInt(n: unknown, fallback: number = 0): number {
  const x = Math.floor(Number(n));
  return Number.isFinite(x) && x >= 0 ? x : fallback;
}

export function startOfLocalDay(d: Date | Timestamp | string): Date {
  const base =
    d instanceof Timestamp
      ? d.toDate()
      : typeof d === "string"
      ? new Date(d)
      : d;
  const copy = new Date(base);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function toLocalMidnight(
  d?: Date | string | Timestamp | null
): Date | null {
  if (!d) return null;
  const dt = d instanceof Timestamp ? d.toDate() : new Date(d);
  dt.setHours(0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export function toDateKeyISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
