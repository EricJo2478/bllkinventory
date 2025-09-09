import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import HoverTooltip from "./HoverTooltip";
import { SyntheticEvent, useState } from "react";
import { expiryDay, today } from "../App";
import { Trash } from "react-bootstrap-icons";
import { EntryData } from "../dataSets/MedData";

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
  data: EntryData;
  onDelete: (id: string) => void;
  onUpdate: (id: string, date: Date | null, amount: number) => void;
}

export default function Entry({ data, onDelete, onUpdate }: Props) {
  const [date, setDate] = useState(data.date as Date | null);
  const [amount, setAmount] = useState(data.amount.toString() as string | null);
  const [showModal, setShowModal] = useState(false);

  const isExpired = () => date && date <= expiryDay;

  // render tooltip for expiry
  const toolTipText = () => {
    if (isExpired()) {
      if (date && date <= today) {
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

  const handleDateChange = (e: SyntheticEvent) => {
    const value = (e.target as HTMLInputElement).value; // new value as string
    const date = value === "" ? null : new Date(value);
    setDate(date);
    onUpdate(data.id, date, Number(amount));
  };

  // handle amount changing
  const handleAmountChange = (e: SyntheticEvent) => {
    const value = (e.target as HTMLInputElement).value; // new value as string
    const parsedvalue = Number(value); // new value as number
    if (isNaN(parsedvalue) || value === "") {
      // if not a number or a blank string clear input field
      setAmount("");
    } else if (parsedvalue < 0) {
      // if a negative number set amount to 0
      setAmount("0");
      onUpdate(data.id, date, 0);
    } else {
      // if 0 or positive number set to the number
      setAmount(value);
      onUpdate(data.id, date, parsedvalue);
    }
  };

  const handleDelete = () => {
    if (Number(amount) > 0) {
      setShowModal(true);
    } else {
      onDelete(data.id);
    }
  };

  return (
    <>
      {showModal && (
        <DeleteModal
          handleClose={() => setShowModal(false)}
          onDelete={() => onDelete(data.id)}
        />
      )}
      <Form>
        <Form.Group className="mb-3" controlId="fromDate">
          <InputGroup>
            {/* Date form field wrapped in tooltip trigger */}
            <HoverTooltip placement="left" text={toolTipText()}>
              <Form.Control
                className={
                  isExpired()
                    ? date && date <= today
                      ? "w-50 bg-danger"
                      : "w-50 bg-warning"
                    : "w-50"
                }
                type="date"
                value={date ? date.toISOString().slice(0, 10) : ""}
                onChange={handleDateChange}
              />
            </HoverTooltip>

            {/* amount input */}
            <HoverTooltip text="Amount in stock goes here">
              <Form.Control
                className="w-25"
                type="number"
                value={amount ? amount : ""}
                onChange={handleAmountChange}
                min="0"
              />
            </HoverTooltip>
            {/* delete trash button */}
            <HoverTooltip placement="right" text="Click me to delete this row">
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
