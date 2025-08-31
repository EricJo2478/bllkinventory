import {
  Accordion,
  Badge,
  Button,
  Card,
  Modal,
  useAccordionButton,
} from "react-bootstrap";
import Order from "./Order";
import { ReactNode, useState } from "react";
import { KeyList } from "../App";
import Med from "./Med";

interface Props {
  order: Order;
  eventKey: string;
  onReceive: () => void;
  meds: KeyList<Med>;
}

export default function OrderAccordionItem({
  order,
  eventKey,
  onReceive,
  meds,
}: Props) {
  const pendingContent: ReactNode[] = [];
  if (order.getStatus() === "Pending") {
    const medsList = Object.values(meds);
    medsList.forEach((med) => {
      med.calcOrder();
    });
    const medsToOrder = medsList.filter((med) => med.getToOrder() > 0);
    order.entries.forEach((entry) => {
      if (medsToOrder.includes(entry.med)) {
        if (entry.amount > entry.med.getToOrder()) {
          pendingContent.push(entry.med.getName() + ": x" + entry.amount);
          medsToOrder.splice(medsToOrder.indexOf(entry.med), 1);
        }
      } else {
        pendingContent.push(entry.med.getName() + ": x" + entry.amount);
      }
    });
    medsToOrder.forEach((med) => {
      pendingContent.push(med.getName() + ": x" + med.getToOrder());
    });
  }

  return (
    <Card key={order.getId()}>
      <OrderHeader
        disableButton={
          order.getStatus() === "Received" || order.getStatus() === "Pending"
        }
        onButtonClick={onReceive}
        eventKey={eventKey}
      >
        {order}
      </OrderHeader>
      <Accordion.Collapse eventKey={eventKey}>
        <Card.Body>
          {order.getStatus() === "Pending"
            ? pendingContent.map((str, index) => {
                return (
                  <p key={index} className="mb-0">
                    {str}
                  </p>
                );
              })
            : order.getContent().map((str, index) => {
                return (
                  <p key={index} className="mb-0">
                    {str}
                  </p>
                );
              })}
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
}

interface ModalProps {
  handleClose: () => void;
  onReceive: Function;
}

function RecieveModal({ handleClose, onReceive }: ModalProps) {
  return (
    <Modal show onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          Are you sure you want to receive this order? Cannot Undo
        </Modal.Title>
      </Modal.Header>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={() => {
            handleClose(), onReceive();
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
  children: Order;
  eventKey: string;
  onButtonClick: (e: any) => void;
  disableButton: boolean;
}

function OrderHeader({
  children,
  eventKey,
  onButtonClick,
  disableButton,
}: HeaderProps) {
  const [show, setShow] = useState(false);

  const decoratedOnClick = useAccordionButton(eventKey);
  return (
    <>
      {show && (
        <RecieveModal
          handleClose={() => setShow(false)}
          onReceive={onButtonClick}
        ></RecieveModal>
      )}
      <Card.Header>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            onClick={decoratedOnClick}
            style={{ flexGrow: 1, cursor: "pointer" }}
          >
            {children.getDateString()}
            <Badge bg={children.getStatusColour()} className="ms-3">
              {children.getStatus()}
            </Badge>
          </div>
          <Button
            disabled={disableButton}
            variant={disableButton ? "secondary" : "primary"}
            onClick={() => setShow(true)}
          >
            Receive
          </Button>
        </div>
      </Card.Header>
    </>
  );
}
