import {
  Button,
  Form,
  InputGroup,
  Modal,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";
import { MedEntry } from "./Med";
import { useState } from "react";

interface Props {
  onDelete: any;
  children: MedEntry;
  onChange: () => void;
}

interface ModalProps {
  handleClose: () => void;
  onDelete: Function;
}

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

export default function MedField({ onChange, children, onDelete }: Props) {
  const [amount, setAmount] = useState(
    (children.amount as number) || undefined
  );
  const [date, setDate] = useState(children.date);
  const [showDelete, setShowDelete] = useState(false);

  const handleAmountChange = (e: any) => {
    const value = e.target.value;
    const Parsedvalue = Number(value);
    if (isNaN(Parsedvalue) || value === "") {
      setAmount(undefined);
    } else if (Parsedvalue < 0) {
      children.amount = 0;
      setAmount(0);
    } else {
      children.amount = Parsedvalue;
      setAmount(Parsedvalue);
      onChange();
    }
  };

  const handleDateChange = (e: any) => {
    children.date = e.target.value;
    setDate(e.target.value);
    onChange();
  };

  const handleDelete = () => {
    if (amount) {
      setShowDelete(true);
    } else {
      onDelete();
    }
  };

  const handleClose = () => {
    setShowDelete(false);
  };

  const isExpired = () => {
    if (date === "") {
      return false;
    }
    return new Date(date) <= new Date();
  };

  const renderExpiryTooltip = (props: any) => {
    if (isExpired()) {
      return (
        <Tooltip {...props}>
          Panic!
          <br /> This is expired!
        </Tooltip>
      );
    }
  };

  return (
    <>
      {showDelete && (
        <DeleteModal
          handleClose={handleClose}
          onDelete={onDelete}
        ></DeleteModal>
      )}
      <Form>
        <Form.Group className="mb-3" controlId="fromDate">
          <InputGroup>
            {isExpired() ? (
              <OverlayTrigger
                placement="left"
                delay={{ show: 250, hide: 400 }}
                overlay={renderExpiryTooltip}
              >
                <Form.Control
                  className={"w-50 bg-danger"}
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                />
              </OverlayTrigger>
            ) : (
              <Form.Control
                className={"w-50"}
                type="date"
                value={date}
                onChange={handleDateChange}
              />
            )}

            <Form.Control
              className="w-25"
              type="number"
              value={amount === undefined ? "" : amount}
              onChange={handleAmountChange}
              min="0"
            />
            <Button variant="outline-secondary" onClick={handleDelete}>
              <Trash />
            </Button>
          </InputGroup>
        </Form.Group>
      </Form>
    </>
  );
}
