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
  const docRef = doc(database, "meds", children.getId());

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
    updateDoc(docRef, { entries: docEntries });
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

  const handelEntryChange = () => {
    setEntries([...entries]);
  };

  if (entries.length === 0) {
    handleNewEntry();
  } else {
    return (
      <>
        <Card className="h-100" style={{ width: "18rem" }}>
          <Card.Body className="d-flex flex-column">
            <Card.Title>{children.getName()}</Card.Title>
            {entries.map((entry) => (
              <MedField
                onChange={handelEntryChange}
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
