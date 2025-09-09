import {
  Accordion,
  Badge,
  Button,
  Card,
  Modal,
  useAccordionButton,
} from "react-bootstrap";
import { useEffect, useState } from "react";
import HoverTooltip from "./HoverTooltip";
import OrderData, { Status } from "../dataSets/OrderData";
import { updateDoc } from "firebase/firestore";

interface Props {
  data: OrderData;
  eventKey: string;
}

// order display component
export default function OrderAccordionItem({ data, eventKey }: Props) {
  const [status, setStatus] = useState(data.status);

  useEffect(() => setStatus(data.status), [data.status]);

  const onReceive = () => {
    setStatus("Received");
    updateDoc(data.docRef, { status: "Received" });
  };
  return (
    <Card>
      <OrderHeader
        title={data.date.toDateString()}
        status={status}
        disableButton={
          // disable button if the order is received or pending
          status === "Received" || status === "Pending"
        }
        onButtonClick={onReceive}
        eventKey={eventKey}
      />
      <Accordion.Collapse eventKey={eventKey}>
        <Card.Body>
          {
            // iterate through the order content and render as p elements
            Object.values(data.meds).map((data, index) => {
              return (
                <p key={index} className="mb-0">
                  {"x" + data.amount + " " + data.med.name}
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
  status: Status;
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
    Ordered: "This order is on it's way but hasn't been marked arrived",
    Received: "This order was marked arrived",
    Zeroed: "This order is old but was never marked arrived",
    Pending: "This order is for the future, it has not been sent yet",
  };

  const badgeColors = {
    Ordered: "secondary",
    Received: "success",
    Zeroed: "warning",
    Pending: "info",
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
