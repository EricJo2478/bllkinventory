import {
  collection,
  DocumentData,
  getDocs,
  QueryDocumentSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { database, IdList } from "../App";
import MedData, { EntryData } from "../dataSets/MedData";
import { Button, Card, Col } from "react-bootstrap";
import Entry from "./Entry";
import HoverTooltip from "./HoverTooltip";
import { SyntheticEvent, useEffect, useState } from "react";

interface Props {
  data: MedData;
}

export default function Med({ data }: Props) {
  const [entries, setEntries] = useState(data.entries);

  useEffect(() => setEntries(data.entries), [data.entries]);

  const handleNewEntry = (e: SyntheticEvent) => {
    const entry: EntryData = { id: uuidv4(), date: "", amount: 0 };
    setEntries((prevState) => ({
      ...prevState,
      [entry.id]: entry,
    }));
  };

  const handeDeleteEntry = (id: string) => {
    const updated = { ...entries };
    delete updated[id];
    setEntries(updated);
    updateDatabase(Object.values(updated));
  };

  const handleEntryUpdate = (
    entry: EntryData,
    date: Date | "",
    amount: number
  ) => {
    const updated = { ...entries };
    entry.date = date;
    entry.amount = amount;
    updateDatabase(Object.values(updated));
    setEntries(updated);
  };

  const updateDatabase = async (updated?: EntryData[]) => {
    if (updated === undefined) {
      updated = Object.values(entries);
    }
    const docEntries: {
      date: Timestamp | string;
      amount: number;
      id: string;
    }[] = []; // array of entries in database format
    updated.forEach((entry) => {
      docEntries.push({
        date: entry.date ? Timestamp.fromDate(entry.date) : "",
        amount: entry.amount,
        id: entry.id,
      });
    });

    // update firebase doc for med
    updateDoc(data.docRef, { entries: docEntries });
  };

  return (
    <Col className="mb-3">
      <Card className="h-100" style={{ width: "18rem" }}>
        <Card.Body className="d-flex flex-column">
          {/* Use med name as card Title */}
          <Card.Title>{data.name}</Card.Title>
          {/* Display total (not soon to expire) amount and amount on order for med*/}
          <Card.Subtitle className="d-flex justify-content-around">
            <p>Total: {data.getAmount()}</p>
            <p>
              Ordered:
              {
                " " + data.onOrder //+
                // (pendingEntry
                //   ? pendingEntry.getAmount()
                //   : 0)) /* indlude the amount manually pending order in the on order value */
              }
            </p>
          </Card.Subtitle>

          {
            // iterate through entries rendering them
            Object.values(entries).map((entry) => (
              <Entry
                key={entry.id}
                data={entry}
                onDelete={handeDeleteEntry}
                onUpdate={handleEntryUpdate}
              />
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

export async function fetchMeds(
  docs?: QueryDocumentSnapshot<DocumentData, DocumentData>[],
  aliasDocs?: QueryDocumentSnapshot<DocumentData, DocumentData>[]
) {
  if (docs === undefined) {
    const data = await getDocs(collection(database, "meds"));
    docs = data.docs;
  }
  const meds: IdList<MedData> = {};
  for (const doc of docs) {
    const data = doc.data();
    const entries: EntryData[] = [];
    for (const entry of data.entries) {
      if (entry.date) {
        let id = entry.id;
        if (id === undefined) {
          id = uuidv4();
        }
        entries.push({
          id: id,
          date: entry.date.toDate(),
          amount: entry.amount,
        });
      } else {
        entries.push({ id: uuidv4(), date: "", amount: entry.amount });
      }
    }
    meds[doc.id] = new MedData(
      doc.id,
      data.name,
      data.display,
      data.group ? data.group : "",
      data.min,
      data.max,
      data.pkg < 0 ? 0 : data.pkg,
      entries,
      data.formName
    );
  }

  if (aliasDocs === undefined) {
    const data = await getDocs(collection(database, "aliases"));
    aliasDocs = data.docs;
  }
  for (const doc of aliasDocs) {
    const data = doc.data();
    const entries: EntryData[] = [];
    for (const entry of data.entries) {
      if (entry.date) {
        let id = entry.id;
        if (id === undefined) {
          id = uuidv4();
        }
        entries.push({
          id: id,
          date: entry.date === "" ? "" : entry.date.toDate(),
          amount: entry.amount,
        });
      } else {
        entries.push({ id: uuidv4(), date: "", amount: entry.amount });
      }
    }
    const parent = meds[data.parent];
    const med = new MedData(
      doc.id,
      data.name,
      parent.display,
      parent.group,
      0,
      0,
      0,
      entries
    );
    meds[doc.id] = med;
    parent.children.push(med);
    med.parent = parent;
  }

  // sort orders
  const entries = Object.entries(meds);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedOrders = Object.fromEntries(entries);

  return sortedOrders as IdList<MedData>;
}
