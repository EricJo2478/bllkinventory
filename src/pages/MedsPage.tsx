// src/pages/MedsPage.tsx

import { Container, Row } from "react-bootstrap";
import { useMeds } from "../hooks/useMeds";
import MedCard from "../components/common/MedCard";

export default function MedsPage() {
  const { meds } = useMeds();

  return (
    <Container>
      <Row>
        {meds
          .filter((med) => med.display !== false)
          .map((med) => (
            <MedCard key={med.id} med={med} />
          ))}
      </Row>
    </Container>
  );
}
