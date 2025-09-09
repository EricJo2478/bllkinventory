import {
  collection,
  DocumentData,
  getDocs,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { database, IdList } from "../App";
import OrderData from "../dataSets/OrderData";

interface Props {
  data: OrderData;
}

export default function Order({ data }: Props) {
  return false;
}

export async function fetchOrders(
  docs?: QueryDocumentSnapshot<DocumentData, DocumentData>[]
) {
  if (docs === undefined) {
    const data = await getDocs(collection(database, "orders"));
    docs = data.docs;
  }
  const orders: IdList<OrderData> = {};
  for (const doc of docs) {
    const data = doc.data();
    orders[doc.id] = new OrderData(doc.id, data.date.toDate());
  }

  // sort orders
  const entries = Object.entries(orders);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedOrders = Object.fromEntries(entries);

  return sortedOrders as IdList<OrderData>;
}
