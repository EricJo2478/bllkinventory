// src/utils.ts

import { Timestamp } from "firebase/firestore";

// date constants
export const today = new Date();
export const expiryDay = new Date();
expiryDay.setDate(today.getDate() + 13);
export const monday = new Date();
monday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7));

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
