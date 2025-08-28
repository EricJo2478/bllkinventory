import { v4 as uuidv4 } from "uuid";

export class MedEntry {
  readonly med: Med;
  date: string = "";
  amount: number = 0;
  readonly id: string;

  constructor(med: Med) {
    this.med = med;
    this.id = uuidv4();
  }

  getDate() {
    return new Date(this.date);
  }
}

export default class Med {
  private readonly id: string;
  private readonly name: string;
  private entries: MedEntry[] = [];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
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
