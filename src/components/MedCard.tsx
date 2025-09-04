import { Button, Card } from "react-bootstrap";
import Med from "./Med";
import Order from "./Order";
import MedEntry from "./MedEntry";

interface Props {
  med: Med;
  pending: Order | null;
}

// med display component
export default function MedCard({ med, pending }: Props) {
  const entries = med.getEntries(); // get med entries
  // handle creation of med entry
  const handleNewEntry = () => med.newEntry(new MedEntry(med));

  // get the entry from the pending order matching this med if any
  const pendingEntry = pending ? pending.getEntry(med) : null;

  if (entries.length === 0) {
    // if no entry then create a new (blank) entry instead of rendering
    handleNewEntry();
    return false;
  } else {
    return (
      <>
        <Card className="h-100" style={{ width: "18rem" }}>
          <Card.Body className="d-flex flex-column">
            {/* Use med name as card Title */}
            <Card.Title>{med.getName()}</Card.Title>
            {/* Display total (not soon to expire) amount and amount on order for med*/}
            <Card.Subtitle className="d-flex justify-content-around">
              <p>Total: {med.getAmount()}</p>
              <p>
                Ordered:
                {
                  " " +
                    (med.getAmountOnOrder() +
                      (pendingEntry
                        ? pendingEntry.getAmount()
                        : 0)) /* indlude the amount manually pending order in the on order value */
                }
              </p>
            </Card.Subtitle>
            {
              // iterate through entries rendering them
              entries.map((entry) => entry.render())
            }
            {/* button for adding new med entries */}
            <Button
              type="button"
              className="w-100 mt-auto"
              color="blue"
              onClick={handleNewEntry}
            >
              +
            </Button>
          </Card.Body>
        </Card>
      </>
    );
  }
}
