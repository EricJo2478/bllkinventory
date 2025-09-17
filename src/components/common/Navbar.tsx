import { Button, Container, Nav, Navbar } from "react-bootstrap";
import useAuth from "../../hooks/useAuth";
import { LinkContainer } from "react-router-bootstrap";

// Tiny layout wrapper
export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

export default function NavBar() {
  const { user } = useAuth();
  return (
    <Navbar expand="lg" className="shadow-sm mb-4">
      <Container className="ms-1">
        {/* Brand (link to home) */}
        <LinkContainer to="/">
          <Navbar.Brand>Bllk Inventory v5</Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          {/* Left side links */}
          <Nav className="me-auto">
            <LinkContainer to="/meds">
              <Nav.Link>Meds</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/orders">
              <Nav.Link>Orders</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/submit">
              <Nav.Link>Submit</Nav.Link>
            </LinkContainer>
          </Nav>

          {/* Right side auth actions */}
          <Nav>
            {!user && (
              <LinkContainer to="/login">
                <Button variant="primary" size="sm">
                  Login
                </Button>
              </LinkContainer>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
