import {
  collection,
  getFirestore,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { useEffect, useState } from "react";
import MedCard from "./components/MedCard";
import { Accordion, Col, Container, Row } from "react-bootstrap";
import Med, { fetchMeds } from "./components/Med";
import NavBar from "./components/NavBar";
import LoginForm from "./components/LoginForm";
import Order, { fetchOrders } from "./components/Order";
import MedSettings from "./components/MedSettings";
import OrderAccordionItem from "./components/OrderAccordionItem";
import OrderForm from "./components/OrderForm";

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

export const today = new Date();
export const expiryDay = new Date();
expiryDay.setDate(today.getDate() + 14);
export const zeroedDay = new Date();
zeroedDay.setDate(today.getDate() - 5);
zeroedDay.setHours(0, 0, 0, 0);

export async function firestoreWithNetworkRetry(
  operationFunction: () => Promise<any>,
  maxRetries = 3,
  delayMs = 1000
) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const result = await operationFunction();
      return result; // Success
    } catch (error: any) {
      if (error.code === "unavailable" || error.code === "deadline-exceeded") {
        // Example error codes for network/timeout
        console.warn(
          `Firestore operation failed (retry ${retries + 1}/${maxRetries}):`,
          error.message
        );
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, retries))
        ); // Exponential backoff
        retries++;
      } else {
        throw error; // Re-throw unhandled errors
      }
    }
  }
  throw new Error(`Firestore operation failed after ${maxRetries} retries.`);
}

export interface KeyList<T> {
  [key: string]: T;
}

export default function App() {
  const [meds, setMeds] = useState({} as KeyList<Med>);
  const [orders, setOrders] = useState({} as KeyList<Order>);
  const [user, setCurrentUser] = useState(null as User | null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [pendingOrder, setPendingOrder] = useState(null as Order | null);

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
      const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
        const dataSet: KeyList<Order> = {};
        Object.values(meds).forEach((med) => (med.onOrder = 0));
        let pending: Order | null = null;
        for (const doc of snapshot.docs) {
          const docData = doc.data();
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
          if (docData.status === "Pending") {
            pending = dataSet[doc.id];
          }
        }
        const entries = Object.entries(dataSet);
        entries.sort((a, b) => a[1].compare(b[1]));
        const sortedData = Object.fromEntries(entries);
        setOrders(sortedData);
        setPendingOrder(pending);
      });

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
              {Object.values(meds).map(
                (med) =>
                  med.display && (
                    <Col key={med.getId()} className="mb-3">
                      <MedCard pending={pendingOrder}>{med}</MedCard>
                    </Col>
                  )
              )}
            </Row>
          </Container>
        )}
        {page === "orders" && (
          <Accordion>
            {pendingOrder === null && (
              <OrderAccordionItem
                eventKey="pending"
                meds={meds}
                order={null}
                onReceive={() => null}
              ></OrderAccordionItem>
            )}
            {Object.values(orders).map((order, index) => (
              <OrderAccordionItem
                key={order.getId()}
                eventKey={index.toString()}
                meds={meds}
                order={order}
                onReceive={() => {
                  if (order.getStatus() === "Ordered") {
                    for (const entry of order.getEntries()) {
                      entry.med.onOrder = entry.med.onOrder - entry.amount;
                    }
                  }
                  order.setStatus("Received");
                  setOrders({ ...orders });

                  updateDoc(order.getRef(), { status: "Received" });
                }}
              ></OrderAccordionItem>
            ))}
          </Accordion>
        )}
        <OrderForm
          show={page === "submit"}
          pendingOrder={pendingOrder}
          meds={meds}
          onSubmit={() => setPage("orders")}
        ></OrderForm>

        {page === "meds" && (
          <Container>
            <Row>
              {Object.values(meds).map(
                (med) =>
                  med.display && (
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
                  )
              )}
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
