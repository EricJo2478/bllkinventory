import { Button, Form, InputGroup } from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";
import { MedEntry } from "./Med";
import { useState } from "react";

interface Props {
  onDelete: any;
  children: MedEntry;
}

export default function MedField({ children, onDelete }: Props) {
  const [amount, setAmount] = useState(children.amount);
  const [date, setDate] = useState(children.date);

  const handleAmountChange = (e: any) => {
    const value = Number(e.target.value);
    if (value < 0) {
      children.amount = 0;
      setAmount(0);
    } else {
      children.amount = value;
      setAmount(value);
    }
  };

  const handleDateChange = (e: any) => {
    children.date = e.target.value;
    setDate(e.target.value);
  };

  return (
    <>
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
          <Button variant="outline-secondary" onClick={onDelete}>
            <Trash />
          </Button>
        </InputGroup>
      </Form.Group>
    </>
  );
}
