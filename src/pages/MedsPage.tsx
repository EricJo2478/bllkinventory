// src/pages/MedsPage.tsx

import { Container, Row } from "react-bootstrap";
import useMeds from "../hooks/useMeds";
import MedCard from "../components/common/MedCard";

export default function MedsPage() {
  const { meds } = useMeds();
  console.log(meds);

  return (
    <Container>
      <Row>
        {Object.values(meds)
          .filter((med) => med.display)
          .map((med) => (
            <MedCard key={med.id} med={med} />
          ))}
      </Row>
    </Container>
  );
}
