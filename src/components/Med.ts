import { v4 as uuidv4 } from "uuid";
import { database, KeyList } from "../App";
import { collection, getDocs } from "firebase/firestore";

export async function fetchMeds() {
  const dataSet: KeyList<Med> = {};
  const data = await getDocs(collection(database, "meds"));
  for (const doc of data.docs) {
    const docData = doc.data();
    dataSet[doc.id] = new Med(
      doc.id,
      docData.name,
      docData.group,
      docData.entries
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
  private readonly name: string;
  private readonly group: string;
  private entries: MedEntry[] = [];
  onOrder: number = 0;

  constructor(
    id: string,
    name: string,
    group: string,
    entries: { date: any; amount: number }[]
  ) {
    this.id = id;
    this.name = name;
    this.group = group;
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

  getId() {
    return this.id;
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
}
