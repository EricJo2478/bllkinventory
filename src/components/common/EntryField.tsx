// src/components/common/EntryField.tsx

import { useState } from "react";
import { EntryDoc } from "../../types/Entry";
import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import HoverTooltip from "./HoverTooltip";
import { expiryDay, today } from "../../utils";
import { Trash } from "react-bootstrap-icons";

export default function EntryField({ entry }: { entry: EntryDoc }) {
  const [showModal, setShowModal] = useState<boolean>(false);

  const isExpired = () => entry.date <= expiryDay;

  // render tooltip for expiry
  const toolTipText = () => {
    if (isExpired()) {
      if (entry.date && entry.date <= today) {
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

  const handleDateChange = () => {};
  const handleAmountChange = () => {};
  const handleDelete = () => {};

  return (
    <>
      {showModal && (
        <DeleteModal
          handleClose={() => setShowModal(false)}
          onDelete={() => {}}
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
                    ? entry.date <= today
                      ? "w-50 bg-danger"
                      : "w-50 bg-warning"
                    : "w-50"
                }
                type="date"
                value={entry.date.toISOString().slice(0, 10)}
                onChange={handleDateChange}
              />
            </HoverTooltip>

            {/* amount input */}
            <HoverTooltip text="Amount in stock goes here">
              <Form.Control
                className="w-25"
                type="number"
                value={entry.amount}
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

// modal to confirm deletion of med entry
function DeleteModal({
  handleClose,
  onDelete,
}: {
  handleClose: () => void;
  onDelete: Function;
}) {
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
