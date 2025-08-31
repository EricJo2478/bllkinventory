import {
  Button,
  Col,
  Container,
  FloatingLabel,
  Form,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";
import { database, KeyList } from "../App";
import Med from "./Med";
import Order from "./Order";
import { addDoc, collection, updateDoc } from "firebase/firestore";

async function fetchData(url: string): Promise<any> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json(); // Or .text() for plain text, .blob() for binary data
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

interface Props {
  meds: KeyList<Med>;
  pendingOrder: Order | null;
  show: boolean;
  onSubmit: () => void;
}

export default function OrderForm({
  show,
  meds,
  pendingOrder,
  onSubmit,
}: Props) {
  const formMeds: Med[] = Object.values(meds).filter(
    (med) => med.formName !== null
  );

  formMeds.sort((a, b) => {
    return (a.formName as string).localeCompare(b.formName as string);
  });

  const renderMeds = (meds: Med[]) => {
    const content = [];
    for (let index = 0; index < meds.length; index = index + 2) {
      const medA = meds[index];
      const medB = meds[index + 1];
      content.push(
        <Row key={medA.getId()}>
          <Col>
            <Form.Group className="w-100 mb-3" as={Row}>
              <Form.Label className="w-50">{medA.formName}</Form.Label>
              <FloatingLabel
                controlId={"form" + medA.getId()}
                label={medA.getName()}
                className="mb-3 w-50"
              >
                <Form.Control type="number" placeholder="name@example.com" />
              </FloatingLabel>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className="w-100 mb-3" as={Row}>
              <Form.Label className="w-50">{medB.formName}</Form.Label>
              <FloatingLabel
                controlId={"form" + medB.getId()}
                label={medB.getName()}
                className="mb-3 w-50"
              >
                <Form.Control type="number" placeholder="name@example.com" />
              </FloatingLabel>
            </Form.Group>
          </Col>
        </Row>
      );
    }
    return content;
  };

  const addToPending = () => {
    const ordered: KeyList<number> = {};
    for (const med of formMeds) {
      const element = document.getElementById(
        "form" + med.getId()
      ) as HTMLInputElement;
      const value = parseInt(element.value);

      if (value > 0) {
        ordered[med.getId()] = value;
      }

      element.value = "";
    }
    console.log(ordered, pendingOrder);
    if (Object.keys.length > 0) {
      if (pendingOrder === null) {
        const monday = new Date();
        monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7));
        console.log("new order");
        const medData = Object.entries(ordered).map((entry) => {
          return { id: entry[0], amount: entry[1] };
        });
        addDoc(collection(database, "orders"), {
          status: "Pending",
          meds: medData,
          date: monday,
        });
      } else {
        console.log("update order");
        for (const entry of pendingOrder.entries) {
          const id = entry.med.getId();
          if (ordered[id]) {
            ordered[id] = ordered[id] + entry.amount;
          } else {
            ordered[id] = entry.amount;
          }
        }
        const medData = Object.entries(ordered).map((entry) => {
          return { id: entry[0], amount: entry[1] };
        });
        updateDoc(pendingOrder.docRef, { meds: medData });
      }
    }

    return ordered;
  };

  const handleNewOrder = () => {
    addToPending();
    fetchData(
      "https://script.google.com/macros/s/AKfycbytzNY1-2wxFBA5thGS6wyh9KbATV3zY1EH4eEPuQ_PMTZL1udBZFRCDLearabBLi7O5w/exec"
    );
    onSubmit();
  };
  const handleNextOrder = () => {
    addToPending();
    onSubmit();
  };

  return (
    <Form className={show ? "" : "d-none"}>
      {renderMeds(formMeds)}
      <OverlayTrigger
        placement="top"
        delay={{ show: 250, hide: 400 }}
        overlay={(props) => (
          <Tooltip id="button-tooltip" {...props}>
            Will add the above amounts to the order on Monday morning.
          </Tooltip>
        )}
      >
        <Button
          className="ms-3"
          variant="primary"
          type="button"
          onClick={handleNextOrder}
        >
          Add To Next Order
        </Button>
      </OverlayTrigger>
      <OverlayTrigger
        placement="top"
        delay={{ show: 250, hide: 400 }}
        overlay={(props) => (
          <Tooltip id="button-tooltip" {...props}>
            Will add some automatic meds to the order and submit immediately
          </Tooltip>
        )}
      >
        <Button
          className="ms-3"
          variant="secondary"
          type="button"
          onClick={handleNewOrder}
        >
          Order Now
        </Button>
      </OverlayTrigger>
    </Form>
  );
}
