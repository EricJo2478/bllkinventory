import {
  collection,
  DocumentData,
  getDocs,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { database, IdList } from "../App";
import OrderData from "../dataSets/OrderData";
import MedData from "../dataSets/MedData";
import OrderAccordionItem from "./OrderAccordionItem";

interface Props {
  data?: OrderData;
}

export default function Order({ data }: Props) {
  if (data) {
    return <OrderAccordionItem key={data.id} eventKey={data.id} data={data} />;
  }
  return false;
}

export async function fetchOrders(
  getMed: (id: string) => MedData,
  docs?: QueryDocumentSnapshot<DocumentData, DocumentData>[]
) {
  if (docs === undefined) {
    const data = await getDocs(collection(database, "orders"));
    docs = data.docs;
  }
  const orders: IdList<OrderData> = {};
  for (const doc of docs) {
    const data = doc.data();
    const meds: IdList<{ med: MedData; amount: number }> = {};
    for (const entry of data.meds) {
      meds[entry.id] = { med: getMed(entry.id), amount: entry.amount };
    }
    orders[doc.id] = new OrderData(
      doc.id,
      data.status,
      meds,
      data.date.toDate()
    );
  }

  // sort orders
  const entries = Object.entries(orders);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedOrders = Object.fromEntries(entries);

  return sortedOrders as IdList<OrderData>;
}
