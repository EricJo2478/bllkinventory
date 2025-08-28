import { v4 as uuidv4 } from "uuid";

export class MedEntry {
  readonly med: Med;
  date: string;
  amount: number;
  readonly id: string;

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
  private entries: MedEntry[] = [];

  constructor(
    id: string,
    name: string,
    entries: { date: any; amount: number }[]
  ) {
    this.id = id;
    this.name = name;
    for (const entry of entries) {
      const date = entry.date.toDate().toISOString().slice(0, 10); // format timestamp to string date
      this.entries.push(new MedEntry(this, date, entry.amount));
    }
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
