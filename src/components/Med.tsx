import { database, functionNetworkRetry, KeyList } from "../App";
import {
  collection,
  doc,
  DocumentReference,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { Col } from "react-bootstrap";
import MedCard from "./MedCard";
import Order from "./Order";
import MedSettings from "./MedSettings";
import MedEntry from "./MedEntry";

// fetch meds from database
export async function fetchMeds(handleMedChange: () => void) {
  const dataSet: KeyList<Med> = {}; // init blank keylist
  // try to fetch meds
  const data = await functionNetworkRetry(
    async () => await getDocs(collection(database, "meds"))
  );
  // loop throught meds and make med for each doc
  for (const doc of data.docs) {
    const docData = doc.data();
    dataSet[doc.id] = new Med(
      doc.id,
      docData.name,
      docData.formName,
      docData.group,
      docData.display,
      docData.min,
      docData.max,
      docData.pkg,
      docData.entries,
      handleMedChange
    );
  }

  // try to fetch alias meds
  const aliasData = await functionNetworkRetry(
    async () => await getDocs(collection(database, "aliases"))
  );
  // loop through and get alias med for each doc
  for (const doc of aliasData.docs) {
    const docData = doc.data();
    dataSet[doc.id] = new AliasMed(
      doc.id,
      docData.name,
      docData.entries,
      dataSet[docData.parent],
      handleMedChange
    );
  }

  // sort meds
  const entries = Object.entries(dataSet);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedData = Object.fromEntries(entries);
  return sortedData;
}

export default class Med {
  // med properties
  private readonly id: string;
  private readonly min: number;
  private readonly max: number;
  private readonly pkg: number;
  private readonly name: string;
  private readonly group: string;
  private readonly docRef: DocumentReference;
  private readonly aliases: Med[] = [];
  private readonly display: boolean;
  private readonly formName: string | null;
  private onOrder: number = 0;
  private toOrder: number = 0;
  private entries: MedEntry[] = [];

  // refresh the global meds on change
  readonly handleChange: () => void;

  constructor(
    id: string,
    name: string,
    formName: string | null,
    group: string,
    display: boolean,
    min: number,
    max: number,
    pkg: number,
    entries: { date: any; amount: number }[],
    handleChange: () => void
  ) {
    // init properties
    this.id = id;
    this.name = name;
    this.formName = formName ? formName : null;
    this.group = group ? group : "";
    this.display = display;
    this.min = min;
    this.max = max;
    this.pkg = pkg;

    // get doc ref
    if (this.isAlias()) {
      this.docRef = doc(database, "aliases", this.id);
    } else {
      this.docRef = doc(database, "meds", this.id);
    }

    // create med entries
    for (const entry of entries) {
      if (entry.date) {
        const dateStr = entry.date.toDate().toISOString().slice(0, 10); // format timestamp to string date
        this.entries.push(new MedEntry(this, dateStr, entry.amount));
      } else {
        this.entries.push(new MedEntry(this, "", entry.amount));
      }
    }

    // assing handle change value
    this.handleChange = handleChange;
  }

  // calculate the amount to order
  calculateOrder() {
    if (this.isAlias()) {
      return;
    }
    // get amount in order and already ordered
    let amount = this.getAmount() + this.onOrder;
    // add the amounts from aliases
    for (const alias of this.aliases) {
      amount = amount + alias.getAmount();
    }
    // if below minium then order
    if (amount <= this.min) {
      // calc amount to order in amounts of pkg
      this.toOrder = Math.floor((this.max - amount) / this.pkg) * this.pkg;
    } else {
      this.toOrder = 0;
    }
    this.handleChange(); // update change to meds
  }

  getAmount() {
    let amount = 0; // default 0
    // iterate enteries and add amounts if not expired
    this.entries.forEach(
      (entry) => (amount = amount + entry.getAmountInDate())
    );
    return amount;
  }

  getAmountToOrder = () => this.toOrder;
  getAmountOnOrder = () => this.onOrder;

  compare(other: Med) {
    if (this.getGroup() === other.getGroup()) {
      return this.getName().localeCompare(other.getName());
    }
    return this.getGroup().localeCompare(other.getGroup());
  }

  // get properties
  getGroup = () => this.group;
  getName = () => this.name;
  getFormName = () => this.formName as string;
  getMin = () => this.min;
  getMax = () => this.max;
  getPkg = () => this.pkg;
  getId = () => this.id;
  getRef = () => this.docRef;
  getEntries = () => [...this.entries];
  isAlias = () => false;
  isVisible = () => this.display;
  resetAmountOnOrder = () => (this.onOrder = 0);

  // add to the on order amount
  addOnOrder(amount: number) {
    this.onOrder = this.onOrder + amount;
    this.handleChange();
  }

  // remove from the on order amount
  removeOnOrder(amount: number) {
    this.onOrder = this.onOrder - amount;
    if (this.onOrder < 0) this.onOrder = 0;
    this.handleChange();
  }

  // add med entry to entries, update firebase and refresh meds
  newEntry(entry: MedEntry) {
    const docEntries: { date: Timestamp | string; amount: number }[] = []; // array of entries in database format
    this.entries.forEach((entry) => {
      docEntries.push(entry.toObject());
    });

    // update firebase doc for med
    updateDoc(this.getRef(), { entries: docEntries });

    this.entries.push(entry); // push to entries array
    this.handleChange();
  }

  // remove entry from med by id
  removeEntry(entryId: string) {
    this.entries = this.entries.filter((item) => item.getId() !== entryId);
    this.calculateOrder();
  }

  // set entries to new array and refresh
  setEntries(entries: MedEntry[]) {
    this.entries = [...entries];
    this.calculateOrder();
  }

  // add aliasmed as an alias
  addAlias(alias: AliasMed) {
    this.aliases.push(alias);
  }

  // render med card for this med if visible
  render(pendingOrder: Order | null) {
    if (this.isVisible()) {
      return (
        <Col key={this.getId()} className="mb-3">
          <MedCard pending={pendingOrder} med={this} />
        </Col>
      );
    }
    return false;
  }

  // render settings card for this med if visible
  renderSettings(setMeds: Function, handleChange: () => void) {
    if (this.isVisible()) {
      return (
        <Col key={this.getId()} className="mb-3">
          <MedSettings
            med={this}
            handleMedChange={() => {
              fetchMeds(handleChange).then((d) => {
                console.log(d);
                setMeds(d);
              });
            }}
          />
        </Col>
      );
    }
    return false;
  }
}

export class AliasMed extends Med {
  private readonly parent: Med;

  constructor(
    id: string,
    name: string,
    entries: { date: any; amount: number }[],
    parent: Med,
    handleChange: () => void
  ) {
    super(
      id,
      name,
      null,
      parent.getGroup(),
      parent.isVisible(),
      parent.getMin(),
      parent.getMax(),
      parent.getPkg(),
      entries,
      handleChange
    );
    this.parent = parent;
    this.parent.addAlias(this);
  }

  compare(other: Med) {
    if (this.getGroup() === other.getGroup()) {
      return this.getName().localeCompare(other.getName());
    }
    return this.getGroup().localeCompare(other.getGroup());
  }

  getParent = () => this.parent;
  isAlias = () => true;
  getAmountToOrder = () => 0;
}
