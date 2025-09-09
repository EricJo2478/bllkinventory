import { collection, doc, DocumentReference } from "firebase/firestore";
import { database, expiryDay, IdList } from "../App";

export interface EntryData {
  id: string;
  date: Date | "";
  amount: number;
}

export default class MedData {
  readonly id: string;
  readonly name: string;
  readonly formName?: string;
  readonly display: boolean;
  readonly group: string;
  readonly docRef: DocumentReference;
  readonly min: number;
  readonly max: number;
  readonly pkg: number;
  readonly children: MedData[] = [];
  parent?: MedData;
  onOrder = 0;
  entries: IdList<EntryData> = {};

  constructor(
    id: string,
    name: string,
    display: boolean,
    group: string,
    min: number,
    max: number,
    pkg: number,
    entries: EntryData[],
    formName?: string
  ) {
    this.id = id;
    this.name = name;
    this.formName = formName;
    this.display = display;
    this.group = group;
    this.docRef = doc(collection(database, "meds"), id);
    this.min = min;
    this.max = max;
    this.pkg = pkg;
    entries.map((entry) => (this.entries[entry.id] = entry));
  }

  isAlias() {
    return this.parent !== undefined;
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
    for (const entry of Object.values(this.entries)) {
      if (entry.date === null || entry.date > expiryDay) {
        amount = amount + entry.amount;
      }
    }
    return amount;
  }

  getAmountWithChildren() {
    let amount = this.getAmount();
    this.children.forEach((child) => (amount = amount + child.getAmount()));
    return amount;
  }

  calcOrder() {
    const amount = this.getAmountWithChildren();
    if (this.pkg > 0 && amount <= this.min) {
      return Math.floor((this.max - amount) / this.pkg) * this.pkg;
    }
    return 0;
  }
}
