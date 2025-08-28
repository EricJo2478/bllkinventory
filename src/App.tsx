import { collection, getDocs, getFirestore } from "firebase/firestore";
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
import { Col, Container, Row } from "react-bootstrap";
import Med from "./components/Med";
import NavBar from "./components/NavBar";
import LoginForm from "./components/LoginForm";

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

async function fetchMeds() {
  const dataSet: KeyList<Med> = {};
  const data = await getDocs(collection(database, "meds"));
  for (const doc of data.docs) {
    const docData = doc.data();
    dataSet[doc.id] = new Med(doc.id, docData.name, docData.entries);
  }
  return dataSet;
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getFirestore(app);
export const auth = getAuth(app);

export interface KeyList<T> {
  [key: string]: T;
}

export default function App() {
  const [meds, setMeds] = useState({} as KeyList<Med>);
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
      fetchMeds().then((d) => setMeds(d));
    }
  }, [user]);

  if (loading) {
    return <div>Loading authentication status...</div>;
  }

  if (user) {
    return (
      <>
        <NavBar setCurrentUser={setCurrentUser} setPage={setPage}></NavBar>
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
      </>
    );
  } else {
    return (
      <>
        <LoginForm setCurrentUser={setCurrentUser}></LoginForm>
        <NavBar setCurrentUser={setCurrentUser} setPage={setPage}></NavBar>
      </>
    );
  }
}
