import { Button, Card } from "react-bootstrap";
import Med, { MedEntry } from "./Med";
import MedField from "./MedField";
import { useEffect, useState } from "react";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import { database } from "../App";

interface Props {
  children: Med;
}

export default function MedCard({ children }: Props) {
  const [entries, setEntries] = useState(children.getEntries());

  useEffect(() => {
    const docEntries = [];
    for (const entry of entries) {
      if (entry.date === "") {
        docEntries.push({
          date: "",
          amount: entry.amount,
        });
      } else {
        docEntries.push({
          date: Timestamp.fromDate(entry.getDate()),
          amount: entry.amount,
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

  const getTotal = () => {
    let total = 0;
    for (const entry of entries) {
      const date = entry.getDate();
      if (isNaN(date.valueOf()) || date > new Date()) {
        total = total + entry.amount;
      }
    }
    return total;
  };

  if (entries.length === 0) {
    handleNewEntry();
  } else {
    return (
      <>
        <Card className="h-100" style={{ width: "18rem" }}>
          <Card.Body className="d-flex flex-column">
            <Card.Title>{children.getName()}</Card.Title>
            <Card.Subtitle className="d-flex justify-content-around">
              <p>Total: {getTotal()}</p>
              <p>Ordered: {children.onOrder}</p>
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
