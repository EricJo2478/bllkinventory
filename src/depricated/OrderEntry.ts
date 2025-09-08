import Med from "./Med";

export default class OrderEntry {
  private readonly med: Med;
  private amount: number;

  constructor(med: Med, amount: number) {
    this.med = med;
    this.amount = amount;
  }

  getAmount() {
    return this.amount;
  }

  getMed() {
    return this.med;
  }

  addToMed() {
    this.med.addOnOrder(this.amount);
  }

  removeFromMed() {
    this.med.removeOnOrder(this.amount);
  }

  toString() {
    return this.med.getName() + ": x" + this.amount;
  }
}
