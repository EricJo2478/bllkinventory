import {
  collection,
  getDocs,
  getFirestore,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { useEffect, useState } from "react";
import MedCard from "./components/MedCard";
import {
  Accordion,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Row,
  useAccordionButton,
} from "react-bootstrap";
import Med, { fetchMeds } from "./components/Med";
import NavBar from "./components/NavBar";
import LoginForm from "./components/LoginForm";
import Order, { fetchOrders } from "./components/Order";
import MedSettings from "./components/MedSettings";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9-6prflaJhhuFut_6-ze9H5JI2ROG0b8",
  authDomain: "bllkinventory-bd8eb.firebaseapp.com",
  projectId: "bllkinventory-bd8eb",
  storageBucket: "bllkinventory-bd8eb.firebasestorage.app",
  messagingSenderId: "803086724359",
  appId: "1:803086724359:web:dcb95778290927a225e9a2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getFirestore(app);
export const auth = getAuth(app);
const ordersRef = collection(database, "orders");

export interface KeyList<T> {
  [key: string]: T;
}

export default function App() {
  const [meds, setMeds] = useState({} as KeyList<Med>);
  const [orders, setOrders] = useState({} as KeyList<Order>);
  const [user, setCurrentUser] = useState(null as User | null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (!loading && user) {
      fetchMeds().then((d) => {
        setMeds(d);
        fetchOrders(d).then((d) => setOrders(d));
      });
    }
  }, [user]);

  useEffect(() => {
    if (!loading && Object.keys(meds).length > 0) {
      console.log("Snapshot Started");
      const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
        const dataSet: KeyList<Order> = {};
        for (const doc of snapshot.docs) {
          const docData = doc.data();
          console.log(doc.id, docData);
          const medEntries = [];
          for (const entry of docData.meds) {
            medEntries.push({ med: meds[entry.id], amount: entry.amount });
          }

          dataSet[doc.id] = new Order(
            doc.id,
            docData.date.toDate(),
            medEntries,
            docData.status
          );
        }
        const entries = Object.entries(dataSet);
        entries.sort((a, b) => a[1].compare(b[1]));
        const sortedData = Object.fromEntries(entries);
        console.log(sortedData);
        setOrders(sortedData);
      });

      console.log("Snapshot Ended");
      // Cleanup function to unsubscribe when the component unmounts
      return () => unsubscribe();
    }
  }, [meds]); // Empty dependency array means this effect runs once on mount

  if (loading) {
    return <div>Loading authentication status...</div>;
  }

  if (user) {
    return (
      <>
        <NavBar
          admin={user.email === "admin@bllk.inv"}
          setCurrentUser={setCurrentUser}
          setPage={setPage}
        ></NavBar>
        {page === "home" && (
          <Container>
            <Row>
              {Object.values(meds).map((med) => (
                <Col key={med.getId()} className="mb-3">
                  <MedCard>{med}</MedCard>
                </Col>
              ))}
            </Row>
          </Container>
        )}
        {page === "orders" && (
          <Accordion>
            {Object.values(orders).map((order, index) => (
              <Card key={order.getId()}>
                <OrderHeader
                  disableButton={order.isReceived()}
                  onButtonClick={() =>
                    order.receive(() => setOrders({ ...orders }))
                  }
                  eventKey={index.toString()}
                >
                  {order}
                </OrderHeader>
                <Accordion.Collapse eventKey={index.toString()}>
                  <Card.Body>
                    {order.getContent().map((str, index) => {
                      return (
                        <p key={index} className="mb-0">
                          {str}
                        </p>
                      );
                    })}
                  </Card.Body>
                </Accordion.Collapse>
              </Card>
            ))}
          </Accordion>
        )}
        {page === "meds" && (
          <Container>
            <Row>
              {Object.values(meds).map((med) => (
                <Col key={med.getId()} className="mb-3">
                  <MedSettings
                    handleMedChange={() => {
                      fetchMeds().then((d) => {
                        setMeds(d);
                      });
                    }}
                  >
                    {med}
                  </MedSettings>
                </Col>
              ))}
              <Col className="mb-3">
                <MedSettings
                  handleMedChange={() => {
                    fetchMeds().then((d) => {
                      setMeds(d);
                    });
                  }}
                >
                  {undefined}
                </MedSettings>
              </Col>
            </Row>
          </Container>
        )}
      </>
    );
  } else {
    return (
      <>
        <LoginForm setCurrentUser={setCurrentUser}></LoginForm>
        <NavBar
          admin={false}
          setCurrentUser={setCurrentUser}
          setPage={setPage}
        ></NavBar>
      </>
    );
  }
}

interface HeaderProps {
  children: Order;
  eventKey: string;
  onButtonClick: (e: any) => void;
  disableButton: boolean;
}

function OrderHeader({
  children,
  eventKey,
  onButtonClick,
  disableButton,
}: HeaderProps) {
  const decoratedOnClick = useAccordionButton(eventKey);
  return (
    <Card.Header>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          onClick={decoratedOnClick}
          style={{ flexGrow: 1, cursor: "pointer" }}
        >
          {children.getDateString()}
          <Badge bg={children.getStatusColour()} className="ms-3">
            {children.getStatus()}
          </Badge>
        </div>
        <Button
          disabled={disableButton}
          variant={disableButton ? "secondary" : "primary"}
          onClick={onButtonClick}
        >
          Receive
        </Button>
      </div>
    </Card.Header>
  );
}
