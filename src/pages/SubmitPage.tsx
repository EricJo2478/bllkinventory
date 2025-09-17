// src/pages/SubmitPage.tsx
import { Button, Col, FloatingLabel, Form, Row } from "react-bootstrap";
import { MedDoc } from "../types/Med";
import { useMeds } from "../hooks/useMeds";
import HoverTooltip from "../components/common/HoverTooltip";

import { useState, useMemo, JSX } from "react";

function FormField({
  med,
  value,
  onChange,
}: {
  med: MedDoc;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <Col>
      <Form.Group className="w-100 mb-3" as={Row}>
        <Form.Label className="w-50">{med.formName}</Form.Label>
        <FloatingLabel
          controlId={"form" + med.id}
          label={med.name}
          className="mb-3 w-50"
        >
          <Form.Control
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder=""
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => onChange(clampInt(e.target.value))}
          />
        </FloatingLabel>
      </Form.Group>
    </Col>
  );
}

export default function ManualForm() {
  const { meds } = useMeds();

  // local state: medId -> quantity
  const [qty, setQty] = useState<Record<string, number>>({});

  const setOne = (id: string, n: number) => setQty((q) => ({ ...q, [id]: n }));

  const clearAll = () => setQty({});

  const ordered = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(qty).filter(([, v]) => Number.isFinite(v) && v > 0)
      ),
    [qty]
  );

  const handleDelayedOrder = async () => {
    //await addToPendingOrder(ordered);
    clearAll();
  };

  const handleInstantOrder = async () => {
    //await addToPendingAndSubmitNow(ordered);
    clearAll();
  };

  // render two columns per row
  const renderRows = () => {
    const rows: JSX.Element[] = [];
    for (let i = 0; i < meds.length; i += 2) {
      rows.push(
        <Row key={meds[i].id}>
          <FormField
            med={meds[i]}
            value={qty[meds[i].id] ?? 0}
            onChange={(n) => setOne(meds[i].id, n)}
          />
          {i + 1 < meds.length && (
            <FormField
              med={meds[i + 1]}
              value={qty[meds[i + 1].id] ?? 0}
              onChange={(n) => setOne(meds[i + 1].id, n)}
            />
          )}
        </Row>
      );
    }
    return rows;
  };

  return (
    <Form className="ms-3">
      {renderRows()}

      <HoverTooltip
        placement="top"
        text="Adds the entered amounts to the Pending order (for Monday)."
      >
        <Button
          className="ms-3"
          variant="primary"
          type="button"
          onClick={handleDelayedOrder}
        >
          Add To Next Order
        </Button>
      </HoverTooltip>

      <HoverTooltip
        placement="top"
        text="Adds the amounts and submits immediately (server-side)."
      >
        <Button
          className="ms-3"
          variant="secondary"
          type="button"
          onClick={handleInstantOrder}
        >
          Order Now
        </Button>
      </HoverTooltip>
    </Form>
  );
}

// utils
function clampInt(v: string | number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
