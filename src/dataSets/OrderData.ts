import { collection, doc, DocumentReference } from "firebase/firestore";
import MedData from "./MedData";
import { database, IdList } from "../App";

export type Status = "Ordered" | "Received" | "Pending" | "Zeroed";

export default class OrderData {
  readonly id: string;
  readonly meds: IdList<{ med: MedData; amount: number }>;
  readonly date: Date;
  readonly docRef: DocumentReference;
  status: Status;

  constructor(
    id: string,
    status: Status,
    meds: IdList<{ med: MedData; amount: number }>,
    date?: Date
  ) {
    this.id = id;
    this.status = status;
    this.date = date ? date : new Date();
    this.meds = meds;
    this.docRef = doc(collection(database, "orders"), id);
  }

  // compare dates on orders
  compare(otherOrder: OrderData) {
    return this.date > otherOrder.date ? -1 : 1;
  }
}
