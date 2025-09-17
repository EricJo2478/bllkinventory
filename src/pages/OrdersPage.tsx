// src/pages/OrdersPage.tsx
import { useEffect, useState } from "react";
import { Accordion } from "react-bootstrap";
import { Timestamp } from "firebase/firestore";

import OrderAccordionItem from "../components/common/OrderAccordionItem";
import { useOrders } from "../hooks/useOrders";

// 👇 add these imports
import { useMeds } from "../hooks/useMeds"; // or from your MedContext if that's where it lives
import { db } from "../services/firebase";
import { buildAutoOrderPreview } from "../services/orderingService";
import type { OrderDoc } from "../types/Order";
import { monday } from "../utils";

export default function OrdersPage() {
  const { orders } = useOrders();
  const { meds, loading: medsLoading } = useMeds();

  // Synthetic, read-only pending order to show at the top
  const [previewOrder, setPreviewOrder] = useState<OrderDoc | null>(null);

  useEffect(() => {
    if (medsLoading) return;
    let cancelled = false;

    (async () => {
      // Read-only prediction (no writes)
      const res = await buildAutoOrderPreview(meds, {
        // Optional knobs:
        // cutoffDate: myNextMondayPlusLeadTime(),
        statusesCountedAsOnOrder: ["pending", "ordered"],
      });
      if (cancelled) return;

      // Turn the combined preview map (pending + delta) into OrderDoc.lines
      const combined = res.combined; // Map<medId, qty>
      if (!combined || combined.size === 0) {
        setPreviewOrder(null);
        return;
      }

      const lines: Record<string, { id: string; quantity: number }> = {};
      combined.forEach((qty, medId) => {
        if (qty > 0) lines[medId] = { id: medId, quantity: Math.floor(qty) };
      });

      // Build a fake/pseudo order that matches your component’s expectations
      const fake: OrderDoc = {
        id: "__preview__", // stable id for Accordion keys
        status: "pending",
        date: Timestamp.fromDate(monday()),
        lines, // OrderAccordionItem reads order.lines -> values[].quantity
      } as unknown as OrderDoc;

      setPreviewOrder(fake);
    })();

    return () => {
      cancelled = true;
    };
  }, [medsLoading, meds]);

  return (
    <Accordion>
      {/* Preview “pending” order FIRST (no writes, Receive is disabled for pending) */}
      {previewOrder && (
        <OrderAccordionItem
          key={previewOrder.id}
          eventKey={previewOrder.id}
          order={previewOrder}
        />
      )}

      {/* Your real orders */}
      {orders.map((order) => (
        <OrderAccordionItem key={order.id} eventKey={order.id} order={order} />
      ))}
    </Accordion>
  );
}
