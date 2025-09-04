import {
  Button,
  Card,
  Col,
  FloatingLabel,
  Form,
  InputGroup,
  Row,
} from "react-bootstrap";
import Med from "./Med";
import { useState } from "react";
import { addDoc, collection, updateDoc } from "firebase/firestore";
import { database } from "../App";

interface Props {
  med?: Med;
  handleMedChange: Function;
}

export default function MedSettings({ med, handleMedChange }: Props) {
  const [saved, setSaved] = useState(true);
  const [group, setGroup] = useState(med ? med.getGroup() : "");
  const [min, setMin] = useState(
    med
      ? med.getMin() < 0
        ? undefined
        : med.getMin()
      : (undefined as number | undefined)
  );
  const [max, setMax] = useState(
    med
      ? med.getMax() < 0
        ? undefined
        : med.getMax()
      : (undefined as number | undefined)
  );
  const [pkg, setPkg] = useState(
    med
      ? med.getPkg() < 0
        ? undefined
        : med.getPkg()
      : (undefined as number | undefined)
  );

  const handleGroupChange = (e: any) => {
    const value = e.target.value as string;
    setGroup(value);
    setSaved(false);
  };
  const handleMinChange = (e: any) => {
    const value = e.target.value;
    const parsedValue = Number(value);
    if (isNaN(parsedValue)) {
      setMin(undefined);
    } else if (parsedValue < 0) {
      setMin(0);
    } else {
      setMin(value);
      setSaved(false);
    }
  };
  const handleMaxChange = (e: any) => {
    const value = e.target.value;
    const parsedValue = Number(value);
    if (isNaN(parsedValue)) {
      setMax(undefined);
    } else if (parsedValue < 0) {
      setMax(0);
    } else {
      setMax(value);
      setSaved(false);
    }
  };
  const handlePkgChange = (e: any) => {
    const value = e.target.value;
    const parsedValue = Number(value);
    if (isNaN(parsedValue)) {
      setPkg(undefined);
    } else if (parsedValue < 0) {
      setPkg(0);
    } else {
      setPkg(value);
      setSaved(false);
    }
  };
  const handleSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData);
    console.log(payload);
    if (med) {
      const data = {
        name: med.getName(),
        group: payload.group as string,
        min: Number(payload.min),
        max: Number(payload.max),
        pkg: Number(payload.pkg),
      };
      updateDoc(med.getRef(), data);
      setSaved(true);
    } else {
      const data = {
        name: payload.name as string,
        group: payload.group as string,
        min: payload.min === "" ? -1 : Number(payload.min),
        max: payload.max === "" ? -1 : Number(payload.max),
        pkg: payload.pkg === "" ? -1 : Number(payload.pkg),
        entries: [],
      };
      setGroup("");
      setMin(undefined);
      setMax(undefined);
      setPkg(undefined);
      (document.getElementById("floatingName") as HTMLInputElement).value = "";
      addDoc(collection(database, "meds"), data).then(() => handleMedChange());
    }
  };

  const handleCancel = (e: any) => {
    if (med) {
      setGroup(med.getGroup());
      setMin(med.getMin());
      setMax(med.getMax());
      setPkg(med.getPkg());
      setSaved(true);
    }
  };

  return (
    <>
      <Card className="h-100" style={{ width: "18rem" }}>
        <Card.Body className="d-flex flex-column">
          {med && <Card.Title className="mb-4">{med.getName()}</Card.Title>}
          {!saved && med && (
            <Card.Subtitle className="fst-italic text-muted">
              Unsaved
            </Card.Subtitle>
          )}
          <Form onSubmit={handleSubmit}>
            {med === undefined && (
              <FloatingLabel controlId="floatingName" label="Name">
                <Form.Control
                  onChange={() => setSaved(false)}
                  type="text"
                  placeholder="Medication"
                  name="name"
                />
              </FloatingLabel>
            )}
            <FloatingLabel controlId="floatingGroup" label="Group">
              <Form.Control
                onChange={handleGroupChange}
                type="text"
                placeholder="Injectable"
                name="group"
                value={group ? group : ""}
              />
            </FloatingLabel>
            <InputGroup className="mb-3">
              <FloatingLabel controlId="floatingMin" label="Min">
                <Form.Control
                  onChange={handleMinChange}
                  type="number"
                  placeholder="0"
                  name="min"
                  min="0"
                  value={min ? min : ""}
                />
              </FloatingLabel>
              <FloatingLabel controlId="floatingMax" label="Max">
                <Form.Control
                  onChange={handleMaxChange}
                  type="number"
                  placeholder="0"
                  name="max"
                  min="0"
                  value={max ? max : ""}
                />
              </FloatingLabel>
              <FloatingLabel controlId="floaingPkg" label="Pkg">
                <Form.Control
                  onChange={handlePkgChange}
                  type="number"
                  placeholder="0"
                  name="pkg"
                  min="0"
                  value={pkg ? pkg : ""}
                />
              </FloatingLabel>
            </InputGroup>
            <Button
              className={med ? "w-50" : "w-100"}
              variant="primary"
              type="submit"
            >
              {med ? "Save" : "Create"}
            </Button>
            {med && (
              <Button
                onClick={handleCancel}
                className="w-50"
                variant="secondary"
                type="button"
              >
                Cancel
              </Button>
            )}
          </Form>
        </Card.Body>
      </Card>
    </>
  );
}
