// src/components/common/MedCard.tsx

import { Button, Card, Col } from "react-bootstrap";
import { MedDoc } from "../../types/Med";
import { useEntries } from "../../hooks/useEntries";
import EntryField from "./EntryField";
import HoverTooltip from "./HoverTooltip";

export default function MedCard({ med }: { med: MedDoc }) {
  const { entries } = useEntries(med.id);

  const handleNewEntry = () => {};

  return (
    <Col className="mb-3">
      <Card className="h-100" style={{ width: "18rem" }}>
        <Card.Body className="d-flex flex-column">
          {/* Use med name as card Title */}
          <Card.Title>{med.name}</Card.Title>
          {/* Display total (not soon to expire) amount and amount on order for med*/}
          <Card.Subtitle className="d-flex justify-content-around">
            <p>Total: {med.amount}</p>
            <p>
              Ordered:
              {" " + 0}
            </p>
          </Card.Subtitle>

          {
            // iterate through entries rendering them
            Object.values(entries).map((entry) => (
              <EntryField key={entry.id} entry={entry} />
            ))
          }
          {/* button for adding new med entries */}
          <HoverTooltip text="Click me to add a new row" placement="bottom">
            <Button
              type="button"
              className="w-100 mt-auto"
              color="blue"
              onClick={handleNewEntry}
            >
              +
            </Button>
          </HoverTooltip>
        </Card.Body>
      </Card>
    </Col>
  );
}
