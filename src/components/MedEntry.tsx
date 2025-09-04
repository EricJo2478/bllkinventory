import Med from "./Med";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase/firestore";
import MedField from "./MedField";

export default class MedEntry {
  // look 14 days in advance of expiry date when ordering
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

  getDateString = () => this.date;
  getDate = () => new Date(this.date);
  getAmount = () => this.amount;
  getId = () => this.id;
  getMed = () => this.med;

  getAmountInDate() {
    return this.isExpired() ? 0 : this.amount;
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

  // object version of entry for database
  toObject() {
    return {
      date: this.date === "" ? "" : Timestamp.fromDate(this.getDate()),
      amount: this.amount,
    };
  }

  // check if date is expired
  isExpired() {
    if (this.date === "") {
      return false;
    }
    return this.getDate() <= MedEntry.expiryDay;
  }

  render() {
    return (
      <MedField
        key={this.id}
        onDelete={() => {
          this.med.removeEntry(this.id);
        }}
        entry={this}
      />
    );
  }
}
