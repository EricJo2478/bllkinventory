import { Button, Form, InputGroup, Modal } from "react-bootstrap";
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
  const [amount, setAmount] = useState(children.amount);
  const [date, setDate] = useState(children.date);
  const [showDelete, setShowDelete] = useState(false);

  const handleAmountChange = (e: any) => {
    const value = Number(e.target.value);
    if (value < 0) {
      children.amount = 0;
      setAmount(0);
    } else {
      children.amount = value;
      setAmount(value);
    }
    onChange();
  };

  const handleDateChange = (e: any) => {
    children.date = e.target.value;
    setDate(e.target.value);
    onChange();
  };

  const handleDelete = () => {
    if (amount === 0) {
      onDelete();
    } else {
      setShowDelete(true);
    }
  };

  const handleClose = () => {
    setShowDelete(false);
  };

  return (
    <>
      {showDelete && (
        <DeleteModal
          handleClose={handleClose}
          onDelete={onDelete}
        ></DeleteModal>
      )}
      <Form.Group className="mb-3" controlId="fromDate">
        <InputGroup>
          <Form.Control
            className="w-50"
            type="date"
            value={date}
            onChange={handleDateChange}
          />
          <Form.Control
            className="w-25"
            type="number"
            value={amount}
            onChange={handleAmountChange}
          />
          <Button variant="outline-secondary" onClick={handleDelete}>
            <Trash />
          </Button>
        </InputGroup>
      </Form.Group>
    </>
  );
}
