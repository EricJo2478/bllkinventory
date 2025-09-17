// src/components/common/MedCard.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Badge } from "react-bootstrap";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

import { MedDoc } from "../../types/Med";
import EntryField from "./EntryField";
import HoverTooltip from "./HoverTooltip";

import { db } from "../../services/firebase";
import { addEntry } from "../../services/entryService";
import { expiryDay } from "../../utils";

type Props = { med: MedDoc };

export default function MedCard({ med }: Props) {
  // --- live "on order" across all orders with status IN ["pending","ordered"]
  const onOrder = useOnOrderQty(med.id);

  // total that isn't soon-to-expire (uses your expiryDay cutoff)
  const total = useMemo(() => {
    const cutoff = expiryDay();
    const list = Array.isArray(med.entries) ? med.entries : [];
    return list.reduce((sum, e) => {
      const d =
        e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as any);
      return d >= cutoff ? sum + (e.amount || 0) : sum;
    }, 0);
  }, [med.entries]);

  const handleNewEntry = async () => {
    try {
      await addEntry(med.id, {
        amount: 0,
      });
    } catch (err) {
      console.error("[MedCard] addEntry failed:", err);
    }
  };

  return (
    <Col className="mb-3">
      <Card className="h-100" style={{ width: "18rem" }}>
        <Card.Body className="d-flex flex-column">
          {/* Title */}
          <Card.Title className="d-flex justify-content-between align-items-center">
            <span>{med.name}</span>
            {med.aliasOf && (
              <Badge bg="secondary" title={`Alias of ${med.aliasOf}`}>
                ALIAS
              </Badge>
            )}
          </Card.Title>

          {/* Subtitle: Total & On order */}
          <Card.Subtitle className="d-flex justify-content-around mb-2 text-muted">
            <span>
              Total: <strong>{total}</strong>
            </span>
            <span>
              Ordered: <strong>{onOrder}</strong>
            </span>
          </Card.Subtitle>

          {/* Entries */}
          <div className="d-flex flex-column gap-2">
            {(Array.isArray(med.entries) ? med.entries : []).map((entry) => (
              <EntryField key={entry.id} medId={med.id} entry={entry} />
            ))}
          </div>

          {/* Add new entry */}
          <HoverTooltip text="Add a new expiry/quantity row" placement="bottom">
            <Button
              type="button"
              className="w-100 mt-auto"
              variant="primary"
              onClick={handleNewEntry}
            >
              +
            </Button>
          </HoverTooltip>
        </Card.Body>
      </Card>
    </Col>
  );
}

/**
 * Live on-order quantity for a med:
 * - Subscribes to root /orders where status IN ["pending","ordered"]
 * - For each such order, listens to its single line doc: /orders/{orderId}/lines/{medId}
 * - Sums quantities across those orders
 *
 * This avoids needing orderStatus on each line; if you DO denormalize it,
 * you can replace this with a single collectionGroup query.
 */
function useOnOrderQty(medId: string) {
  const [qty, setQty] = useState(0);
  const lineUnsubsRef = useRef(new Map<string, () => void>()); // orderId -> unsub
  const lineQtyRef = useRef(new Map<string, number>()); // orderId -> qty

  useEffect(() => {
    const clearLines = () => {
      lineUnsubsRef.current.forEach((u) => u());
      lineUnsubsRef.current.clear();
      lineQtyRef.current.clear();
      setQty(0);
    };

    // listen to "open" orders
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["pending", "ordered"])
    );
    const unsubOrders = onSnapshot(
      q,
      (snap) => {
        const currentIds = new Set<string>();
        snap.forEach((o) => currentIds.add(o.id));

        // remove listeners for orders that closed
        for (const [orderId, unsub] of Array.from(
          lineUnsubsRef.current.entries()
        )) {
          if (!currentIds.has(orderId)) {
            unsub();
            lineUnsubsRef.current.delete(orderId);
            lineQtyRef.current.delete(orderId);
          }
        }

        // add listeners for new/changed orders
        for (const orderId of currentIds) {
          if (!lineUnsubsRef.current.has(orderId)) {
            const lineRef = doc(db, "orders", orderId, "lines", medId);
            const unsubLine = onSnapshot(lineRef, (lineDoc) => {
              const data = (lineDoc.exists() ? lineDoc.data() : null) as {
                quantity?: number;
              } | null;
              const q = Math.max(0, Math.floor(Number(data?.quantity ?? 0)));
              lineQtyRef.current.set(orderId, q);
              // recompute total
              let sum = 0;
              lineQtyRef.current.forEach((v) => (sum += v || 0));
              setQty(sum);
            });
            lineUnsubsRef.current.set(orderId, unsubLine);
          }
        }
      },
      (err) => {
        console.error("[MedCard] onOrder subscription error:", err);
        clearLines();
      }
    );

    return () => {
      unsubOrders();
      clearLines();
    };
  }, [medId]);

  return qty;
}
