import { db } from "../services/firebase";
import {
  lineSelectors,
  useOrderLineService,
} from "../services/orderLineService";

export default function useOrderLines(orderId: string) {
  const lines = useOrderLineService(db, orderId, lineSelectors.all);
  const { status } = useOrderLineService(db, orderId, lineSelectors.status);
  return { lines: lines, status: status };
}
