// src/pages/SubmitPage.tsx

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Button, Col, FloatingLabel, Form, Row } from "react-bootstrap";
import { MedDoc } from "../types/Med";
import { db } from "../services/firebase";
import useMeds from "../hooks/useMeds";
import { monday } from "../utils";
import HoverTooltip from "../components/common/HoverTooltip";

function FormField({ med }: { med: MedDoc }) {
  return (
    <Col>
      <Form.Group className="w-100 mb-3" as={Row}>
        <Form.Label className="w-50">{med.formName}</Form.Label>
        <FloatingLabel
          controlId={"form" + med.id}
          label={med.name}
          className="mb-3 w-50"
        >
          <Form.Control type="number" placeholder="" />
        </FloatingLabel>
      </Form.Group>
    </Col>
  );
}

export default function ManualForm() {
  const { meds } = useMeds();

  const handleDelayedOrder = async () => {
    const ordered: Record<string, number> = {};
    for (const med of meds) {
      const element = document.getElementById(
        "form" + med.id
      ) as HTMLInputElement;
      const value = parseInt(element.value);

      if (value > 0) {
        ordered[med.id] = value;
      }
      element.value = "";
    }
    const ref = collection(db, "orders");
    const q = query(ref, where("status", "==", "Pending"), limit(1));
    const docs = (await getDocs(q)).docs;
    if (docs.length > 0) {
      const id = docs[0].id;
      const meds = docs[0].data().meds as { id: string; amount: number }[];
      const medData = Object.entries(ordered).map((entry) => {
        return { id: entry[0], amount: entry[1] };
      });
      medData.forEach((entry) => {
        const index = meds.findIndex((item) => item.id === entry.id);
        if (index < 0) {
          meds.push(entry);
        } else {
          meds[index].amount = meds[index].amount + entry.amount;
        }
      });

      updateDoc(doc(collection(db, "orders"), id), { meds: meds });
    } else {
      console.log("new order");
      const medData = Object.entries(ordered).map((entry) => {
        return { id: entry[0], amount: entry[1] };
      });
      addDoc(collection(db, "orders"), {
        status: "Pending",
        meds: medData,
        date: monday,
      });
    }
  };
  const handleInstantOrder = () => {
    handleDelayedOrder();
    fetch(
      "https://script.google.com/macros/s/AKfycbytzNY1-2wxFBA5thGS6wyh9KbATV3zY1EH4eEPuQ_PMTZL1udBZFRCDLearabBLi7O5w/exec"
    );
  };

  const render = () => {
    const contents = [];
    for (let index = 0; index < meds.length; index += 2) {
      contents.push(
        <Row key={meds[index].id}>
          <FormField med={meds[index]} />
          {index + 1 < meds.length && <FormField med={meds[index + 1]} />}
        </Row>
      );
    }
    return contents;
  };

  return (
    <Form className="ms-3">
      {render()}
      <HoverTooltip
        placement="top"
        text="Will add the above amounts to the order on Monday morning."
      >
        <Button
          className="ms-3"
          variant="primary"
          type="button"
          onClick={handleDelayedOrder}
        >
          Add To Next Order
        </Button>
      </HoverTooltip>
      <HoverTooltip
        placement="top"
        text="Will add some automatic meds to the order and submit immediately."
      >
        <Button
          className="ms-3"
          variant="secondary"
          type="button"
          onClick={handleInstantOrder}
        >
          Order Now
        </Button>
      </HoverTooltip>
    </Form>
  );
}
