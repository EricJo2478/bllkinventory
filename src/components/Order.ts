import { database, KeyList } from "../App";
import {
  collection,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import Med, { MedEntry } from "./Med";

export async function fetchOrders(meds: KeyList<Med>) {
  const dataSet: KeyList<Order> = {};
  const data = await getDocs(collection(database, "orders"));
  for (const doc of data.docs) {
    const docData = doc.data();
    const medEntries = [];
    for (const entry of docData.meds) {
      medEntries.push({ med: meds[entry.id], amount: entry.amount });
    }

    dataSet[doc.id] = new Order(
      doc.id,
      docData.date.toDate(),
      medEntries,
      docData.status
    );
  }
  const entries = Object.entries(dataSet);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedData = Object.fromEntries(entries);
  return sortedData;
}
export default class Order {
  readonly id: string;
  readonly date: Date;
  readonly entries: { med: Med; amount: number }[];
  status: string;
  readonly docRef;

  constructor(
    id: string,
    date: Date,
    entries: { med: Med; amount: number }[],
    status: string
  ) {
    this.id = id;
    this.date = date;
    this.status = status;
    this.docRef = doc(database, "orders", this.id);

    this.entries = entries;

    if (this.status === "Ordered") {
      for (const entry of this.entries) {
        entry.med.onOrder = entry.med.onOrder + entry.amount;
      }
    }
  }

  getId() {
    return this.id;
  }

  getDate() {
    return this.date;
  }

  getDateString() {
    return this.date.toDateString();
  }

  getStatus() {
    return this.status;
  }

  getEntries() {
    return [...this.entries];
  }

  getRef() {
    return this.docRef;
  }

  setStatus(status: string) {
    this.status = status;
  }

  getStatusColour() {
    if (this.status === "Ordered") {
      return "secondary";
    }
    if (this.status === "Received") {
      return "success";
    }
    if (this.status === "Zeroed") {
      return "warning";
    }
    if (this.status === "Pending") {
      return "info";
    }
  }

  getContent() {
    const output = [];
    for (const entry of this.entries) {
      output.push(entry.med.getName() + ": x" + entry.amount);
    }
    return output;
  }

  isReceived() {
    return this.status === "Received";
  }

  compare(other: Order) {
    return this.getDate() > other.getDate() ? -1 : 1;
  }
}
