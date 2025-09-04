import {
  Button,
  Form,
  InputGroup,
  Modal,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";
import { useState } from "react";
import MedEntry from "./MedEntry";
import HoverTooltip from "./HoverTooltip";

interface ModalProps {
  handleClose: () => void;
  onDelete: Function;
}

// modal to confirm deletion of med entry
function DeleteModal({ handleClose, onDelete }: ModalProps) {
  return (
    <Modal show onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Are you sure you want to delete this entry?</Modal.Title>
      </Modal.Header>
      <Modal.Footer>
        <Button
          variant="danger"
          onClick={() => {
            handleClose(), onDelete();
          }}
        >
          DELETE
        </Button>
        <Button variant="primary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

interface Props {
  onDelete: any;
  entry: MedEntry;
}

// rendered component of a med entry
export default function MedField({ entry, onDelete }: Props) {
  const [showDelete, setShowDelete] = useState(false);

  // handle amount changing
  const handleAmountChange = (e: any) => {
    const value = e.target.value; // new value as string
    const Parsedvalue = Number(value); // new value as number

    if (isNaN(Parsedvalue) || value === "") {
      // if not a number or a blank string clear input field
      e.target.value = "";
    } else if (Parsedvalue < 0) {
      // if a negative number set amount to 0
      entry.setAmount(0);
    } else {
      // if 0 or positive number set to the number
      entry.setAmount(Parsedvalue);
    }
  };

  // handle date changing
  const handleDateChange = (e: any) => {
    entry.setDate(e.target.value);
  };

  // handle delete button being pressed
  const handleDelete = () => {
    // if the amount is zero execute delete, otherwise confirm with modal
    if (entry.getAmount() > 0) {
      setShowDelete(true);
    } else {
      entry.getMed().removeEntry(entry.getId());
    }
  };

  // render tooltip for expiry
  const toolTipText = () => {
    if (entry.isExpired()) {
      if (entry.getDate() <= new Date()) {
        return (
          <p>
            Panic! <br /> This is expired
          </p>
        );
      }
      return (
        <p>
          Panic soon! <br /> This is almost expired!
        </p>
      );
    }
    return "Expiry date goes here";
  };

  return (
    <>
      {
        // if delete modal should be visible render one
        showDelete && (
          <DeleteModal
            handleClose={() => setShowDelete(false)}
            onDelete={() => entry.getMed().removeEntry(entry.getId())}
          ></DeleteModal>
        )
      }
      <Form>
        <Form.Group className="mb-3" controlId="fromDate">
          <InputGroup>
            {/* Date form field wrapped in tooltip trigger */}
            <HoverTooltip placement="top" text={toolTipText()}>
              <Form.Control
                className={
                  entry.isExpired()
                    ? entry.getDate() <= new Date()
                      ? "w-50 bg-danger"
                      : "w-50 bg-warning"
                    : "w-50"
                }
                type="date"
                value={entry.getDateString()}
                onChange={handleDateChange}
              />
            </HoverTooltip>

            {/* amount input */}
            <HoverTooltip text="Amount in stock goes here">
              <Form.Control
                className="w-25"
                type="number"
                value={entry.getAmount()}
                onChange={handleAmountChange}
                min="0"
              />
            </HoverTooltip>
            {/* delete trash button */}
            <HoverTooltip text="Click me to delete this row">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={handleDelete}
              >
                <Trash />
              </Button>
            </HoverTooltip>
          </InputGroup>
        </Form.Group>
      </Form>
    </>
  );
}
