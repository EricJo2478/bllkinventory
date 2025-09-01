import { DataConnectErrorCode } from "firebase/data-connect";
import Med from "./Med";
import { v4 as uuidv4 } from "uuid";

export class MedEntry {
  private static expiryDay = new Date();
  static {
    MedEntry.expiryDay.setDate(new Date().getDate() + 14);
  }

  private readonly id: string;
  private readonly med: Med;
  private date: string;
  private amount: number;

  constructor(med: Med, date: string = "", amount: number = 0) {
    this.med = med;
    this.id = uuidv4();
    this.date = date;
    this.amount = amount;
  }

  getDate = () => new Date(this.date);

  getAmount = () => this.amount;

  getAmountInDate() {
    if (this.date && this.getDate() <= MedEntry.expiryDay) {
      return 0;
    }
    return this.amount;
  }

  setDate(date: string | Date) {
    if (date instanceof Date) {
      date = date.toISOString().slice(0, 10); // format timestamp to string date
    }
    this.date = date;
    this.med.handleChange();
  }

  setAmount(amount: number) {
    this.amount = amount;
    this.med.handleChange();
  }

  render() {}
}
