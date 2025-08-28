import { Container, Nav, Navbar } from "react-bootstrap";

interface Props {
  setPage: Function;
}

export default function NavBar({ setPage }: Props) {
  const pages = ["Home"];

  return (
    <Navbar expand="lg" className="bg-body-tertiary mb-5">
      <Container>
        <Navbar.Brand
          onClick={() => {
            setPage("home");
          }}
        >
          BLLK
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
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
