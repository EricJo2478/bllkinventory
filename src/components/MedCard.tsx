import { Button, Card } from "react-bootstrap";
import Med, { MedEntry } from "./Med";
import MedField from "./MedField";
import { useState } from "react";

interface Props {
  children: Med;
}

export default function MedCard({ children }: Props) {
  const [entries, setEntries] = useState(children.getEntries());

  const handleNewEntry = () => {
    const entry = new MedEntry(children);
    children.newEntry(entry);
    setEntries([...entries, entry]);
  };

  const handleDeleteEntry = (idToDelete: string) => {
    children.setEntries(entries.filter((item) => item.id !== idToDelete));
    setEntries(entries.filter((item) => item.id !== idToDelete));
  };

  if (entries.length === 0) {
    handleNewEntry();
  } else {
    return (
      <Card className="h-100">
        <Card.Body className="d-flex flex-column">
          <Card.Title>{children.getName()}</Card.Title>
          {entries.map((entry) => (
            <MedField
              key={entry.id}
              onDelete={() => {
                handleDeleteEntry(entry.id);
              }}
            >
              {entry}
            </MedField>
          ))}
          <Button
            className="w-100 mt-auto"
            color="blue"
            onClick={handleNewEntry}
          >
            +
          </Button>
        </Card.Body>
      </Card>
    );
  }
}
