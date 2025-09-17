// src/pages/OrdersPage.tsx

import { Accordion } from "react-bootstrap";
import OrderAccordionItem from "../components/common/OrderAccordionItem";
import useOrders from "../hooks/useOrders";

export default function OrdersPage() {
  const { orders } = useOrders();

  return (
    <Accordion>
      {
        // render the orders
        Object.values(orders).map((order) => (
          <OrderAccordionItem
            key={order.id}
            eventKey={order.id}
            order={order}
          />
        ))
      }
    </Accordion>
  );
}
