import { Button, Card } from "react-bootstrap";
import Med, { MedEntry } from "./Med";
import MedField from "./MedField";
import { useEffect, useState } from "react";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import { database } from "../App";
import Order from "./Order";

interface Props {
  children: Med;
  pending: Order;
}

export default function MedCard({ children, pending }: Props) {
  const [entries, setEntries] = useState(children.getEntries());

  useEffect(() => {
    const docEntries = [];
    for (const entry of entries) {
      if (entry.date === "") {
        docEntries.push({
          date: "",
          amount: entry.getAmount(),
        });
      } else {
        docEntries.push({
          date: Timestamp.fromDate(entry.getDate()),
          amount: entry.getAmount(),
        });
      }
    }
    updateDoc(children.getRef(), { entries: docEntries });
  }, [entries]);

  const handleNewEntry = () => {
    const entry = new MedEntry(children);
    children.newEntry(entry);
    setEntries([...entries, entry]);
  };

  const handleDeleteEntry = (idToDelete: string) => {
    children.setEntries(entries.filter((item) => item.id !== idToDelete));
    setEntries(entries.filter((item) => item.id !== idToDelete));
  };

  const handleEntryChange = () => {
    setEntries([...entries]);
  };

  const pendingEntry = pending ? pending.getEntry(children) : null;

  if (entries.length === 0) {
    handleNewEntry();
  } else {
    return (
      <>
        <Card className="h-100" style={{ width: "18rem" }}>
          <Card.Body className="d-flex flex-column">
            <Card.Title>{children.getName()}</Card.Title>
            <Card.Subtitle className="d-flex justify-content-around">
              <p>Total: {children.getAmount()}</p>
              <p>
                Ordered:{" "}
                {children.onOrder + (pendingEntry ? pendingEntry.amount : 0)}
              </p>
            </Card.Subtitle>
            {entries.map((entry) => (
              <MedField
                onChange={handleEntryChange}
                key={entry.id}
                onDelete={() => {
                  handleDeleteEntry(entry.id);
                }}
              >
                {entry}
              </MedField>
            ))}
            <Button
              type="button"
              className="w-100 mt-auto"
              color="blue"
              onClick={handleNewEntry}
            >
              +
            </Button>
          </Card.Body>
        </Card>
      </>
    );
  }
}
