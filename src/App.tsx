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
import Med, { fetchMeds } from "./components/Med";
import NavBar from "./components/NavBar";
import Order, { fetchOrders } from "./components/Order";
import MedSettings from "./components/MedSettings";
import OrderForm from "./components/OrderForm";
import { useEffect, useState } from "react";

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
export interface KeyList<T> {
  [key: string]: T;
}

export default function App() {
  const [meds, setMeds] = useState({} as KeyList<Med>); // list of loaded meds
  const [orders, setOrders] = useState({} as KeyList<Order>); // list of loaded orders
  const [user, setCurrentUser] = useState(null as User | null); // authentiaced user
  const [loading, setLoading] = useState(true); // state for while page is loading
  const [page, setPage] = useState("home"); // current page being displayed
  const [pendingOrder, setPendingOrder] = useState(null as Order | null); // the pending order (if any)

  // should be run whenever a property of a med changes to refresh react
  const handleMedsChange = () => {
    setMeds({ ...meds });
  };
  // should be run whenever a property of an order changes to refresh react
  const handleOrdersChange = () => {
    setOrders({ ...orders });
  };

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
    meds: KeyList<Med>,
    snapshot?: QuerySnapshot<DocumentData, DocumentData>
  ) => {
    // fetch orders passing in the snapshot docs
    fetchOrders(handleOrdersChange, meds, snapshot?.docs).then((data) => {
      // set the orders and pending from data
      const [orderData, pending] = data;
      // save the orders and pending order
      setOrders(orderData as KeyList<Order>);
      setPendingOrder(pending as Order);
      handleMedsChange(); // meds onOrder value changed
    });
  };

  // fetch the meds and orders once the user is loaded
  useEffect(() => {
    if (!loading && user) {
      fetchMeds(handleMedsChange).then((meds) => {
        setMeds(meds);
        getNewOrders(meds);
      });
    }
  }, [user]);

  // setup a snapshot to track order changes in the database if the meds and user are loaded
  useEffect(() => {
    if (!loading && Object.keys(meds).length > 0) {
      const unsubscribe = onSnapshot(
        collection(database, "orders"),
        (snapshot) => {
          getNewOrders(meds, snapshot);
        }
      );

      // Cleanup function to unsubscribe when the component unmounts
      return () => unsubscribe();
    }
  }, []);

  // if page is loading display a message
  if (loading) {
    return (
      <>
        <NavBar
          admin={false}
          setCurrentUser={setCurrentUser}
          setPage={setPage}
        ></NavBar>
        <div>Loading authentication status...</div>
      </>
    );
  }

  return (
    <>
      {/* display nav bar */}
      <NavBar
        admin={user && user.email === "admin@bllk.inv" ? true : false} // check if user is admin
        setCurrentUser={setCurrentUser}
        setPage={setPage}
      ></NavBar>
      {
        // display home page by rendering each med
        page === "home" && (
          <Container>
            <Row>
              {Object.values(meds).map((med) => med.render(pendingOrder))}
            </Row>
          </Container>
        )
      }
      {
        // display orders page by rendering each order
        page === "orders" && (
          <Accordion>
            {
              // if there is no pending order display an artificial pending order
              pendingOrder === null && Order.renderPendingOrder(meds)
            }
            {
              // render the orders
              Object.values(orders).map((order) => order.render())
            }
          </Accordion>
        )
      }
      {/* render orderform in the background but hide when on another page so the form isn't reset on page change */}
      <OrderForm
        show={page === "submit"}
        pendingOrder={pendingOrder}
        meds={meds}
        onSubmit={() => setPage("orders")}
      />
      {
        // display meds settings page by rendering each med settings
        page === "meds" && (
          <Row>
            {Object.values(meds).map((med) =>
              med.renderSettings(setMeds, handleMedsChange)
            )}
            {/* Meds Settings submition form */}
            <Col className="mb-3">
              <MedSettings
                handleMedChange={() => {
                  fetchMeds(handleMedsChange).then((d) => {
                    setMeds(d);
                  });
                }}
              />
            </Col>
          </Row>
        )
      }
    </>
  );
  // if done loading and have user
  //   if (user) {
  //     return (
  //       <>
  //         <NavBar
  //           admin={user.email === "admin@bllk.inv"}
  //           setCurrentUser={setCurrentUser}
  //           setPage={setPage}
  //         ></NavBar>
  //         {page === "home" && (
  //           <Container>
  //             <Row>
  //               {Object.values(meds).map(
  //                 (med) =>
  //                   med.display && (
  //                     <Col key={med.getId()} className="mb-3">
  //                       <MedCard pending={pendingOrder}>{med}</MedCard>
  //                     </Col>
  //                   )
  //               )}
  //             </Row>
  //           </Container>
  //         )}
  //         {page === "orders" && (
  //           <Accordion>
  //             {pendingOrder === null && (
  //               <OrderAccordionItem
  //                 eventKey="pending"
  //                 meds={meds}
  //                 order={null}
  //                 onReceive={() => null}
  //               ></OrderAccordionItem>
  //             )}
  //             {Object.values(orders).map((order, index) => (
  //               <OrderAccordionItem
  //                 key={order.getId()}
  //                 eventKey={index.toString()}
  //                 meds={meds}
  //                 order={order}
  //                 onReceive={() => {
  //                   if (order.getStatus() === "Ordered") {
  //                     for (const entry of order.getEntries()) {
  //                       entry.med.onOrder = entry.med.onOrder - entry.amount;
  //                     }
  //                   }
  //                   order.setStatus("Received");
  //                   setOrders({ ...orders });

  //                   updateDoc(order.getRef(), { status: "Received" });
  //                 }}
  //               ></OrderAccordionItem>
  //             ))}
  //           </Accordion>
  //         )}
  //         <OrderForm
  //           show={page === "submit"}
  //           pendingOrder={pendingOrder}
  //           meds={meds}
  //           onSubmit={() => setPage("orders")}
  //         ></OrderForm>

  //         {page === "meds" && (
  //           <Container>
  //             <Row>
  //               {Object.values(meds).map(
  //                 (med) =>
  //                   med.display && (
  //                     <Col key={med.getId()} className="mb-3">
  //                       <MedSettings
  //                         handleMedChange={() => {
  //                           fetchMeds().then((d) => {
  //                             setMeds(d);
  //                           });
  //                         }}
  //                       >
  //                         {med}
  //                       </MedSettings>
  //                     </Col>
  //                   )
  //               )}
  //               <Col className="mb-3">
  //                 <MedSettings
  //                   handleMedChange={() => {
  //                     fetchMeds().then((d) => {
  //                       setMeds(d);
  //                     });
  //                   }}
  //                 >
  //                   {undefined}
  //                 </MedSettings>
  //               </Col>
  //             </Row>
  //           </Container>
  //         )}
  //       </>
  //     );
  //   } else {
  //     return (
  //       <>
  //         <LoginForm setCurrentUser={setCurrentUser}></LoginForm>
  //         <NavBar
  //           admin={false}
  //           setCurrentUser={setCurrentUser}
  //           setPage={setPage}
  //         ></NavBar>
  //       </>
  //     );
  //   }
}
