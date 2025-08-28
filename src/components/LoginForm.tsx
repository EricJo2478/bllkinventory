import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";

interface Props {
  onLogin: (e: any) => void;
}

export default function LoginForm({ onLogin }: Props) {
  const [show, setShow] = useState(true);
  return (
    <Modal show={show}>
      <Modal.Header>
        <Modal.Title>Log in</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          onSubmit={(e) => {
            setShow(false), onLogin(e);
          }}
        >
          <Form.Group className="mb-3" controlId="formUsername">
            <Form.Label>Email address</Form.Label>
            <Form.Control autoFocus type="text" placeholder="Enter username" />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" placeholder="Password" />
          </Form.Group>
          <Button variant="primary" type="submit">
            Log In
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
