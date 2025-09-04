import { database, KeyList } from "../App";
import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  getDocs,
  QueryDocumentSnapshot,
  updateDoc,
} from "firebase/firestore";
import Med from "./Med";
import OrderAccordionItem from "./OrderAccordionItem";
import OrderEntry from "./OrderEntry";

export async function fetchOrders(
  handleOrdersChange: () => void,
  meds: KeyList<Med>,
  docs?: QueryDocumentSnapshot<DocumentData, DocumentData>[]
) {
  if (docs === undefined) {
    const data = await getDocs(collection(database, "orders"));
    docs = data.docs;
  }
  // init order dataset
  const dataSet: KeyList<Order> = {};
  let pending: Order | null = null; // pending order defaults null

  // clear the onOrder values in the meds
  Object.values(meds).forEach((med) => med.resetAmountOnOrder());

  // create order for every doc received
  for (const doc of docs) {
    const docData = doc.data();
    // create an array of order entries from the entries array
    const orderEntries = [];
    for (const entry of docData.meds) {
      orderEntries.push(new OrderEntry(meds[entry.id], entry.amount));
    }

    // create order
    dataSet[doc.id] = new Order(
      doc.id,
      docData.date.toDate(),
      orderEntries,
      docData.status,
      handleOrdersChange
    );

    // save order if it is the pending order
    if (docData.status === "Pending") {
      pending = dataSet[doc.id];
    }
  }

  // sort orders
  const entries = Object.entries(dataSet);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedData = Object.fromEntries(entries);

  return [sortedData as KeyList<Order>, pending];
}

export default class Order {
  // render the "fake" pending order if there is none
  static renderPendingOrder(meds: KeyList<Med>) {
    return <OrderAccordionItem eventKey="pending" meds={meds} />;
  }
  // date to zero orders on or before
  private static zeroedDay = new Date();
  static {
    Order.zeroedDay.setDate(new Date().getDate() - 5);
    Order.zeroedDay.setHours(0, 0, 0, 0);
  }
  // date pending order will be ordered
  static pendingDate = new Date();
  static {
    Order.pendingDate.setDate(
      new Date().getDate() + ((1 + 7 - Order.pendingDate.getDay()) % 7)
    );
  }

  // properties declaration
  private readonly id: string;
  private readonly date: Date;
  private readonly entries: OrderEntry[];
  private readonly docRef: DocumentReference;
  private status: string;

  // refresh the global orders on change
  readonly handleChange: () => void;

  constructor(
    id: string,
    date: Date,
    entries: OrderEntry[],
    status: string,
    handleChange: () => void
  ) {
    // init properties
    this.id = id;
    date.setHours(0, 0, 0, 0); // normalize the hours on the order date
    this.date = date;
    this.docRef = doc(database, "orders", this.id);
    this.entries = entries;

    // if order is on order still check if it should be zeroed and zero if needed
    if (status === "Ordered") {
      if (this.date >= Order.zeroedDay) {
        this.status = status;

        // iterate through entries and add to the meds onOrder
        this.entries.forEach((entry) => entry.addToMed());
      } else {
        this.status = "Zeroed";
      }
    } else {
      this.status = status;
    }

    // assing handle change value
    this.handleChange = handleChange;
  }

  render() {
    return (
      <OrderAccordionItem
        key={this.getId()}
        eventKey={this.getId()}
        order={this}
        onReceive={() => {
          if (this.getStatus() === "Ordered") {
            this.entries.forEach((entry) => entry.removeFromMed());
          }
          this.setStatus("Received");
          updateDoc(this.getRef(), { status: "Received" });
        }}
      />
    );
  }

  // get entry matching a med
  getEntry(med: Med): OrderEntry | null {
    for (const entry of this.entries) {
      if (entry.getMed() === med) {
        return entry;
      }
    }
    return null;
  }

  // get properties
  getId = () => this.id;
  getDate = () => this.date;
  getDateString = () => this.date.toDateString();
  getStatus = () => this.status;
  getEntries = () => [...this.entries];
  getRef = () => this.docRef;
  isReceived = () => this.status === "Received";

  // change status
  setStatus(status: string) {
    this.status = status;
    this.handleChange();
  }

  // get badge colour for the current status
  getStatusColour() {
    const statusColours: KeyList<string> = {
      Ordered: "secondary",
      Received: "success",
      Zeroed: "warning",
      Pending: "info",
    };
    return statusColours[this.getStatus()];
  }

  // get the list of meds in order
  getContent() {
    const output: string[] = [];
    this.entries.forEach((entry) => output.push(entry.toString()));
    output.sort();
    return output;
  }

  // compare dates on orders
  compare(otherOrder: Order) {
    return this.getDate() > otherOrder.getDate() ? -1 : 1;
  }
}
