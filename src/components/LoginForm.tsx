import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import { auth } from "../App";

interface Props {
  setCurrentUser: Function;
}

export default function LoginForm({ setCurrentUser }: Props) {
  const [show, setShow] = useState(true);
  const [failed, setFailed] = useState(false);

  const handleSignin = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData);
    signInWithEmailAndPassword(
      auth,
      (payload.username as string) + "@bllk.inv",
      payload.password as string
    )
      .then((user) => {
        if (user) {
          setCurrentUser(user.user);
          setShow(false);
          console.log("User signed in successfully.");
        }
        // You might want to redirect the user to a login page or update UI
      })
      .catch((error) => {
        // An error happened.
        setFailed(true);
        console.error("Error signing in:", error);
      });
  };

  return (
    <Modal show={show}>
      <Modal.Header>
        <Modal.Title>Log in</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {failed && (
          <Alert variant="danger" onClose={() => setFailed(false)} dismissible>
            <p>Oh snap! You entered invalid credentials!</p>
          </Alert>
        )}
        <Form onSubmit={handleSignin}>
          <Form.Group className="mb-3" controlId="formUsername">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              name="username"
              autoFocus
              type="text"
              placeholder="Enter username"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              name="password"
              type="password"
              placeholder="Password"
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Log In
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
