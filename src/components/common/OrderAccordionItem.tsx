import {
  Accordion,
  Badge,
  Button,
  Card,
  Modal,
  useAccordionButton,
} from "react-bootstrap";
import { useEffect, useState } from "react";
import { updateDoc } from "firebase/firestore";
import { OrderDoc, orderStatus } from "../../types/Order";
import { useMed } from "../../hooks/useMeds";
import HoverTooltip from "./HoverTooltip";

// order display component
export default function OrderAccordionItem({
  order,
  eventKey,
}: {
  order: OrderDoc;
  eventKey: string;
}) {
  const [status, setStatus] = useState<orderStatus>(order.status);

  useEffect(() => setStatus(order.status), [order.status]);

  const onReceive = () => {};

  if (Object.values(order.meds)[0].id === undefined) {
    return false;
  }

  return (
    <Card>
      <OrderHeader
        title={order.date.toDate().toDateString()}
        status={status}
        disableButton={
          // disable button if the order is received or pending
          status === "received" || status === "pending"
        }
        onButtonClick={onReceive}
        eventKey={eventKey}
      />
      <Accordion.Collapse eventKey={eventKey}>
        <Card.Body>
          {
            // iterate through the order content and render as p elements
            Object.values(order.meds).map((entry, index) => {
              const { med } = useMed(entry.id);
              return (
                <p key={index} className="mb-0">
                  {"x" + entry.amount + " " + med?.name}
                </p>
              );
            })
          }
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
}

interface ModalProps {
  handleClose: () => void;
  onReceive: Function;
}

// modal to confirm an order should be marked received
function RecieveModal({ handleClose, onReceive }: ModalProps) {
  return (
    <Modal show onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          Are you sure you want to receive this order? Cannot Undo
        </Modal.Title>
      </Modal.Header>
      <Modal.Footer>
        {/* button to mark order received and close modal */}
        <Button
          variant="primary"
          onClick={() => {
            handleClose(), onReceive();
          }}
        >
          Receive
        </Button>

        {/* button to close modal */}
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

interface HeaderProps {
  title: string;
  status: orderStatus;
  eventKey: string;
  onButtonClick: (e: any) => void;
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
  // state to track receive confirmation modal visibility
  const [show, setShow] = useState(false);

  // use accordion event for accordion functionality
  const onClick = useAccordionButton(eventKey);

  // get the hover tooltip for the badge
  const tooltipTexts = {
    ordered: "This order is on it's way but hasn't been marked arrived",
    received: "This order was marked arrived",
    zeroed: "This order is old but was never marked arrived",
    pending: "This order is for the future, it has not been sent yet",
  };

  const badgeColors = {
    ordered: "secondary",
    received: "success",
    zeroed: "warning",
    pending: "info",
  };

  return (
    <>
      {
        // show receive modal if modal visiblity is true
        show && (
          <RecieveModal
            handleClose={() => setShow(false)}
            onReceive={onButtonClick}
          ></RecieveModal>
        )
      }
      <Card.Header>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div onClick={onClick} style={{ flexGrow: 1, cursor: "pointer" }}>
            {/*  display date as the header content */}
            {title}
            {/* badge displaying order status using the corisponding colour */}
            <HoverTooltip text={tooltipTexts[status]}>
              <Badge bg={badgeColors[status]} className="ms-3">
                {status}
              </Badge>
            </HoverTooltip>
          </div>
          <HoverTooltip text="Click me to mark that this order has arrived">
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
