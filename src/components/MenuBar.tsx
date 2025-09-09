import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { signOut } from "firebase/auth";
import { auth } from "../App";

interface Props {
  setPage: Function;
  setCurrentUser: Function;
  admin?: boolean;
}

export default function MenuBar({
  setPage,
  setCurrentUser,
  admin = false,
}: Props) {
  const pages = ["Home", "Orders", "Submit"];
  if (admin) {
    pages.push("Meds");
  }

  return (
    <Navbar expand="lg" className="bg-body-tertiary mb-5">
      <Container>
        <Navbar.Brand
          onClick={() => {
            setPage("home");
          }}
        >
          BLLK Meds v4
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {pages.map((name) => (
              <Nav.Link
                key={name}
                onClick={() => {
                  setPage(name.toLocaleLowerCase());
                }}
              >
                {name}
              </Nav.Link>
            ))}
          </Nav>
          <Button
            onClick={() => {
              setCurrentUser(null);
              signOut(auth);
            }}
            type="button"
          >
            Log Out
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
