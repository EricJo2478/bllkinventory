import {
  collection,
  DocumentData,
  getFirestore,
  onSnapshot,
  QuerySnapshot,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { Accordion, Col, Container, Row } from "react-bootstrap";
import { useEffect, useState } from "react";
import Med, { fetchMeds } from "./components/Med";
import Order, { fetchOrders } from "./components/Order";
import OrderData from "./dataSets/OrderData";
import MedData from "./dataSets/MedData";
import MenuBar from "./components/MenuBar";
import LoginForm from "./components/LoginForm";

// Firebase configuration
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

// date constants
export const today = new Date();
export const expiryDay = new Date();
expiryDay.setDate(today.getDate() + 13);

// execute an async function with handling to retry up to 3 times at 1 sec intervals when getting a netword error
export async function functionNetworkRetry(
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
        // Network error handling
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
  throw new Error(`Firestore operation failed after ${maxRetries} retries.`); // too many tries
}

// object of uuid (string) and any
export interface IdList<T> {
  [key: string]: T;
}

export default function App() {
  const [meds, setMeds] = useState({} as IdList<MedData>); // list of loaded meds
  const [orders, setOrders] = useState({} as IdList<OrderData>); // list of loaded orders
  const [user, setCurrentUser] = useState(null as User | null); // authentiaced user
  const [loading, setLoading] = useState(true); // state for while page is loading
  const [page, setPage] = useState("home"); // current page being displayed
  const [pendingOrder, setPendingOrder] = useState(null as OrderData | null); // the pending order (if any)

  // get the authenticated user if already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // save user
      setLoading(false); // mark page as loaded
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  const getNewOrders = (
    meds: IdList<MedData>,
    snapshot?: QuerySnapshot<DocumentData, DocumentData>
  ) => {
    // fetch orders passing in the snapshot docs
    fetchOrders((id: string) => meds[id], snapshot?.docs).then((data) => {
      // save the orders and pending order
      setOrders(data as IdList<OrderData>);
      Object.values(meds).forEach((med) => (med.onOrder = 0));
      Object.values(data).forEach((order) => {
        if (order.status === "Ordered") {
          order.meds.forEach((entry) => {
            if (entry.med) entry.med.onOrder = entry.med.onOrder + entry.amount;
          });
        }
      });
    });
  };

  const getNewMeds = (snapshot?: QuerySnapshot<DocumentData, DocumentData>) => {
    // fetch orders passing in the snapshot docs
    fetchMeds(snapshot?.docs).then((data) => {
      // save the orders and pending order
      setMeds(data as IdList<MedData>);
    });
  };

  // setup a snapshot to track order changes in the database if the user is loaded
  useEffect(() => {
    if (!loading) {
      const unsubscribe = onSnapshot(
        collection(database, "orders"),
        (snapshot) => {
          console.log(meds);
          getNewOrders(meds, snapshot);
        }
      );

      // Cleanup function to unsubscribe when the component unmounts
      return () => unsubscribe();
    }
  }, [user, Object.keys(meds).length]);

  // setup a snapshot to track med changes in the database if the user is loaded
  useEffect(() => {
    if (!loading) {
      const unsubscribe = onSnapshot(
        collection(database, "meds"),
        (snapshot) => {
          getNewMeds(snapshot);
        }
      );

      // Cleanup function to unsubscribe when the component unmounts
      return () => unsubscribe();
    }
  }, [user]);

  // if page is loading display a message
  if (loading) {
    return (
      <>
        <MenuBar setCurrentUser={setCurrentUser} setPage={setPage}></MenuBar>
        <div>Loading authentication status...</div>
      </>
    );
  }

  return (
    <>
      {/* display nav bar */}
      <MenuBar
        admin={user && user.email === "admin@bllk.inv" ? true : false} // check if user is admin
        setCurrentUser={setCurrentUser}
        setPage={setPage}
      ></MenuBar>
      {/* display login page */}
      {user === null && <LoginForm setCurrentUser={setCurrentUser} />}

      {
        // display home page by rendering each med
        page === "home" && (
          <Container>
            <Row>
              {Object.values(meds)
                .filter((med) => med.display)
                .map((med) => (
                  <Med key={med.id} data={med} />
                ))}
            </Row>
          </Container>
        )
      }
      {
        // display orders page by rendering each order
        page === "orders" && (
          <Accordion>
            {
              // render the orders
              Object.values(orders).map((order) => (
                <Order key={order.id} data={order} />
              ))
            }
          </Accordion>
        )
      }
      {/* render orderform in the background but hide when on another page so the form isn't reset on page change */}
      {/* <OrderForm
        show={page === "submit"}
        pendingOrder={pendingOrder}
        meds={meds}
        onSubmit={() => setPage("orders")}
      /> */}
      {
        // display meds settings page by rendering each med settings
        // page === "meds" && (
        //   <Row>
        //     {Object.values(meds).map((med) =>
        //       med.renderSettings(setMeds, handleMedsChange)
        //     )}
        //     {/* Meds Settings submition form */}
        //     <Col className="mb-3">
        //       <MedSettings
        //         handleMedChange={() => {
        //           fetchMeds(handleMedsChange).then((d) => {
        //             setMeds(d);
        //           });
        //         }}
        //       />
        //     </Col>
        //   </Row>
        // )
      }
    </>
  );
}
