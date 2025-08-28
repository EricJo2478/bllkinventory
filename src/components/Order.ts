import { database, KeyList } from "../App";
import { collection, getDocs } from "firebase/firestore";
import Med from "./Med";

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

  constructor(
    id: string,
    date: Date,
    entries: { med: Med; amount: number }[],
    status: string
  ) {
    this.id = id;
    this.date = date;
    this.status = status;

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
  }

  getContent() {
    let output = "";
    for (const entry of this.entries) {
      output = output + entry.med.getName() + ": x" + entry.amount + "\n";
    }
    return output;
  }

  receive(reload: () => void) {
    if (this.status === "Ordered") {
      for (const entry of this.entries) {
        entry.med.onOrder = entry.med.onOrder - entry.amount;
      }
    }
    this.status = "Received";
    reload();
  }

  compare(other: Order) {
    return this.getDate() > other.getDate() ? -1 : 1;
  }
}
