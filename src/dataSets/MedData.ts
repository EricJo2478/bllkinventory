import { collection, doc, DocumentReference } from "firebase/firestore";
import { database, expiryDay } from "../App";

export interface EntryData {
  id: string;
  date: Date | null;
  amount: number;
}

export default class MedData {
  readonly id: string;
  readonly name: string;
  readonly display: boolean;
  readonly group: string;
  readonly docRef: DocumentReference;
  onOrder = 0;
  entries: EntryData[];

  constructor(
    id: string,
    name: string,
    display: boolean,
    group: string,
    entries: EntryData[]
  ) {
    this.id = id;
    this.name = name;
    this.display = display;
    this.group = group;
    this.entries = entries;
    this.docRef = doc(collection(database, "meds"), id);
  }

  // compare dates on orders
  compare(otherMed: MedData) {
    if (this.group === otherMed.group) {
      return this.name.localeCompare(otherMed.name);
    }
    return this.group.localeCompare(otherMed.group);
  }

  getAmount() {
    let amount = 0;
    for (const entry of this.entries) {
      if (entry.date && entry.date > expiryDay) {
        amount = amount + entry.amount;
      }
    }
    return amount;
  }
}
