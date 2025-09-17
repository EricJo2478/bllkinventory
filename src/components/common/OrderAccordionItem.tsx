import {
  Accordion,
  Badge,
  Button,
  Card,
  Modal,
  useAccordionButton,
} from "react-bootstrap";
import { useEffect, useState } from "react";
import { OrderDoc, OrderStatus } from "../../types/Order";
import { useMed } from "../../hooks/useMeds";
import HoverTooltip from "./HoverTooltip";
import { db } from "../../services/firebase";
import { setOrderStatus } from "../../services/orderService";

// order display component
export default function OrderAccordionItem({
  order,
  eventKey,
}: {
  order: OrderDoc;
  eventKey: string;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);

  useEffect(() => setStatus(order.status), [order.status]);

  // service-backed mutation (no firestore calls here)
  const onReceive = async () => {
    // optimistic update; revert if it fails
    const prev = status;
    setStatus("received");
    try {
      await setOrderStatus(db, order.id, "received");
    } catch {
      setStatus(prev);
    }
  };

  // guard: if no meds, render nothing
  const medsArray = Object.values(order.lines ?? []);
  if (medsArray.length === 0) return null;

  return (
    <Card>
      <OrderHeader
        title={order.date.toDate().toDateString()}
        status={status}
        disableButton={status === "received" || status === "pending"}
        onButtonClick={onReceive}
        eventKey={eventKey}
      />
      <Accordion.Collapse eventKey={eventKey}>
        <Card.Body>
          {medsArray.map((entry) => (
            <OrderLine key={entry.id} id={entry.id} amount={entry.quantity} />
          ))}
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
}

/** Child row so we can safely call a hook per line (no hooks in loops). */
function OrderLine({ id, amount }: { id: string; amount: number }) {
  const { med } = useMed(id);
  return (
    <p className="mb-0">{"x" + amount + " " + (med?.name ?? "Unknown")}</p>
  );
}

interface ModalProps {
  handleClose: () => void;
  onReceive: () => void;
}

// ✅ spelling fix: ReceiveModal
function ReceiveModal({ handleClose, onReceive }: ModalProps) {
  return (
    <Modal show onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          Are you sure you want to mark this order as received? Cannot undo.
        </Modal.Title>
      </Modal.Header>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={() => {
            handleClose();
            onReceive();
          }}
        >
          Receive
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

interface HeaderProps {
  title: string;
  status: OrderStatus;
  eventKey: string;
  onButtonClick: () => void;
  disableButton: boolean;
}

// header of an order accordion, including the receive button and status badge
function OrderHeader({
  title,
  status,
  eventKey,
  onButtonClick,
  disableButton,
}: HeaderProps) {
  const [show, setShow] = useState(false);
  const onClick = useAccordionButton(eventKey);

  const tooltipTexts: Record<OrderStatus, string> = {
    ordered: "This order is on its way but hasn't been marked as arrived.",
    received: "This order was marked as arrived.",
    zeroed: "This order is old but was never marked as arrived.",
    pending: "This order is for the future; it has not been sent yet.",
  };

  const badgeColors: Record<
    OrderStatus,
    "secondary" | "success" | "warning" | "info"
  > = {
    ordered: "secondary",
    received: "success",
    zeroed: "warning",
    pending: "info",
  };

  return (
    <>
      {show && (
        <ReceiveModal
          handleClose={() => setShow(false)}
          onReceive={onButtonClick}
        />
      )}
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div onClick={onClick} style={{ flexGrow: 1, cursor: "pointer" }}>
            {title}
            <HoverTooltip text={tooltipTexts[status]}>
              <Badge bg={badgeColors[status]} className="ms-3 text-uppercase">
                {status}
              </Badge>
            </HoverTooltip>
          </div>
          <HoverTooltip text="Click to mark this order as received">
            <Button
              disabled={disableButton}
              variant={disableButton ? "secondary" : "primary"}
              onClick={() => setShow(true)}
            >
              Receive
            </Button>
          </HoverTooltip>
        </div>
      </Card.Header>
    </>
  );
}
