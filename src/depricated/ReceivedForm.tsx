import { Button, FloatingLabel, Form, Modal, Row } from "react-bootstrap";
import Order from "./Order";

interface Props {
  handleClose: () => void;
  onSubmit: (e: any) => void;
  order: Order;
}

export default function ReceivedForm({ handleClose, onSubmit, order }: Props) {
  return (
    <Modal show>
      <Modal.Header closeButton>
        <Modal.Title>Order {order.getDateString()}</Modal.Title>
      </Modal.Header>
      <Modal.Footer>
        <Form
          onSubmit={(e) => {
            onSubmit(e);
            handleClose();
          }}
        >
          {order.getEntries().map((entry) => {
            const med = entry.getMed();
            return (
              <Row key={med.getId()}>
                <FloatingLabel controlId={med.getId() + "date"} label="Date">
                  <Form.Control type="date" name={med.getId() + "date"} />
                </FloatingLabel>
                <FloatingLabel
                  controlId={med.getId() + "amount"}
                  label="Amount"
                >
                  <Form.Control
                    type="number"
                    placeholder={entry.getAmount().toString()}
                    name={med.getId() + "amount"}
                  />
                </FloatingLabel>
              </Row>
            );
          })}
        </Form>
        <Button variant="primary" type="submit">
          Receive
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
