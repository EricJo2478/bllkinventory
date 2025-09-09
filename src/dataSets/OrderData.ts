export default class OrderData {
  readonly id: string;
  readonly date: Date;

  constructor(id: string, date?: Date) {
    this.id = id;
    this.date = date ? date : new Date();
  }

  // compare dates on orders
  compare(otherOrder: OrderData) {
    return this.date > otherOrder.date ? -1 : 1;
  }
}
