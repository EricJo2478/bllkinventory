import { v4 as uuidv4 } from "uuid";
import { database, KeyList } from "../App";
import {
  collection,
  doc,
  DocumentReference,
  getDocs,
} from "firebase/firestore";

export async function fetchMeds() {
  const dataSet: KeyList<Med> = {};
  const data = await getDocs(collection(database, "meds"));
  for (const doc of data.docs) {
    const docData = doc.data();
    dataSet[doc.id] = new Med(
      doc.id,
      docData.name,
      docData.group,
      docData.min,
      docData.max,
      docData.pkg,
      docData.entries
    );
  }
  const aliasData = await getDocs(collection(database, "aliases"));
  for (const doc of aliasData.docs) {
    const docData = doc.data();
    dataSet[doc.id] = new AliasMed(
      doc.id,
      docData.name,
      docData.entries,
      dataSet[docData.parent]
    );
  }
  const entries = Object.entries(dataSet);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedData = Object.fromEntries(entries);
  return sortedData;
}

export class MedEntry {
  readonly id: string;
  readonly med: Med;
  date: string;
  amount: number;

  constructor(med: Med, date: string = "", amount: number = 0) {
    this.med = med;
    this.id = uuidv4();
    this.date = date;
    this.amount = amount;
  }

  getDate() {
    return new Date(this.date);
  }
}

export default class Med {
  private readonly id: string;
  private readonly min: number;
  private readonly max: number;
  private readonly pkg: number;
  private readonly name: string;
  private readonly group: string;
  private readonly docRef: DocumentReference;
  private entries: MedEntry[] = [];
  onOrder: number = 0;

  constructor(
    id: string,
    name: string,
    group: string,
    min: number,
    max: number,
    pkg: number,
    entries: { date: any; amount: number }[]
  ) {
    this.id = id;
    this.name = name;
    this.group = group;
    this.min = min;
    this.max = max;
    this.pkg = pkg;
    if (this instanceof AliasMed) {
      this.docRef = doc(database, "aliases", this.id);
    } else {
      this.docRef = doc(database, "meds", this.id);
    }

    for (const entry of entries) {
      if (entry.date) {
        const date = entry.date.toDate().toISOString().slice(0, 10); // format timestamp to string date
        this.entries.push(new MedEntry(this, date, entry.amount));
      } else {
        this.entries.push(new MedEntry(this, "", entry.amount));
      }
    }
  }

  compare(other: Med) {
    if (this.getGroup() === other.getGroup()) {
      return this.getName().localeCompare(other.getName());
    }
    return this.getGroup().localeCompare(other.getGroup());
  }

  getGroup() {
    return this.group;
  }

  getName() {
    return this.name;
  }

  getMin() {
    return this.min;
  }

  getMax() {
    return this.max;
  }

  getPkg() {
    return this.pkg;
  }

  getId() {
    return this.id;
  }

  getRef() {
    return this.docRef;
  }

  getEntries() {
    return [...this.entries];
  }

  newEntry(entry: MedEntry) {
    this.entries.push(entry);
  }

  setEntries(entries: MedEntry[]) {
    this.entries = entries;
  }

  isAlias() {
    return false;
  }
}

export class AliasMed extends Med {
  private readonly parent: Med;
  constructor(
    id: string,
    name: string,
    entries: { date: any; amount: number }[],
    parent: Med
  ) {
    super(
      id,
      name,
      parent.getGroup(),
      parent.getMin(),
      parent.getMax(),
      parent.getPkg(),
      entries
    );
    this.parent = parent;
  }

  compare(other: Med) {
    if (this.getGroup() === other.getGroup()) {
      return this.getName().localeCompare(other.getName());
    }
    return this.getGroup().localeCompare(other.getGroup());
  }

  getGroup() {
    return super.getGroup();
  }

  getName() {
    return super.getName();
  }

  getMin() {
    return super.getMin();
  }

  getMax() {
    return super.getMax();
  }

  getPkg() {
    return super.getPkg();
  }

  getId() {
    return super.getId();
  }

  getRef() {
    return super.getRef();
  }

  getEntries() {
    return super.getEntries();
  }

  getParent() {
    return this.parent;
  }

  newEntry(entry: MedEntry) {
    const entries = super.getEntries();
    entries.push(entry);
    this.setEntries(entries);
  }

  setEntries(entries: MedEntry[]) {
    super.setEntries(entries);
  }

  isAlias() {
    return true;
  }
}
