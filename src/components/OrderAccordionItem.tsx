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
  order?: Order;
  eventKey: string;
  onReceive?: () => void;
  meds?: KeyList<Med>;
}

// order display component
export default function OrderAccordionItem({
  order,
  eventKey,
  onReceive,
  meds,
}: Props) {
  // array for the pending orders content
  const pendingContent: ReactNode[] = [];
  if (order === undefined || order.getStatus() === "Pending") {
    // list of all meds
    const medsList = meds ? Object.values(meds) : [];

    // iterate through meds and update the amount to order
    // medsList.forEach((med) => med.calculateOrder());

    // filter the meds list ot the meds that are actually getting ordered
    const medsToOrder = medsList.filter((med) => med.getAmountToOrder() > 0);

    // if there is a pre-exisiting order
    if (order) {
      // add each orders meds to the content if there isn't more being auto-ordered
      order.getEntries().forEach((entry) => {
        const med = entry.getMed(); //
        // check if med is both manually and auto-ordered
        if (medsToOrder.includes(med)) {
          // if ther is more manually ordered of a med than automatically
          if (entry.getAmount() > med.getAmountToOrder()) {
            // add the entry to the pending content and remove the med from the auot-order array
            pendingContent.push(entry.toString());
            medsToOrder.splice(medsToOrder.indexOf(med), 1);
          }
        } else {
          // if ther is no overlap then simply add the entry to the contents
          pendingContent.push(entry.toString());
        }
      });
    }

    // add each automatically ordered med to the pening contents
    medsToOrder.forEach((med) => {
      pendingContent.push(med.getName() + ": x" + med.getAmountToOrder());
    });

    // sort pending content
    pendingContent.sort();

    // if there is no pending content don't render and accordion item
    if (pendingContent.length === 0) {
      return false;
    }
  }

  return (
    <Card>
      <OrderHeader
        disableButton={
          // disable button if the order is received or pending
          order
            ? order.getStatus() === "Received" ||
              order.getStatus() === "Pending"
            : true
        }
        onButtonClick={onReceive ? onReceive : () => {}}
        eventKey={eventKey}
        order={order}
      />
      <Accordion.Collapse eventKey={eventKey}>
        <Card.Body>
          {order === undefined || order.getStatus() === "Pending"
            ? // if order is pending then render the pending content as p elements
              pendingContent.map((str, index) => {
                return (
                  <p key={index} className="mb-0">
                    {str}
                  </p>
                );
              })
            : // iterate through the order content and render as p elements
              order.getContent().map((str, index) => {
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
  order?: Order;
  eventKey: string;
  onButtonClick: (e: any) => void;
  disableButton: boolean;
}

// header of an order accordion, including the receive button and status badge
function OrderHeader({
  order,
  eventKey,
  onButtonClick,
  disableButton,
}: HeaderProps) {
  // state to track receive confirmation modal visibility
  const [show, setShow] = useState(false);

  // use accordion event for accordion functionality
  const onClick = useAccordionButton(eventKey);

  // get date of order (monday if pending order)
  let date = order ? order.getDateString() : Order.pendingDate.toDateString();

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
            {date}
            {/* badge displaying order status using the corisponding colour */}
            <Badge
              bg={order ? order.getStatusColour() : "info"}
              className="ms-3"
            >
              {order ? order.getStatus() : "Pending"}
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
