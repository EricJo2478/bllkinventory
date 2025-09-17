// src/components/common/EntryField.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";
import { Timestamp } from "firebase/firestore";
import HoverTooltip from "./HoverTooltip";

import { updateEntry, deleteEntry } from "../../services/entryService";
import { EntryDoc } from "../../types/Med";
import { expiryDay, today } from "../../utils";

type Props = {
  medId: string;
  entry: EntryDoc;
};

export default function EntryField({ medId, entry }: Props) {
  // --- local controlled state for the date input (never toISOString)
  const [dateStr, setDateStr] = useState<string>("");
  // local amount as string to avoid cursor jumps
  const [amountStr, setAmountStr] = useState<string>("");
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // derive helpers
  const date = useMemo(() => entry.date?.toDate() ?? "", [entry.date]);
  const isExpired = useMemo(() => (date ? date <= expiryDay() : false), [date]);

  useEffect(() => {
    if (entry.date) {
      const d = entry.date.toDate();
      setDateStr(formatDateForInput(d));
    } else {
      setDateStr(""); // start blank for new/missing dates
    }
  }, [entry.date]);

  // keep local state in sync when Firestore entry changes
  useEffect(() => {
    setDateStr(date ? formatDateForInput(date) : ""); // "YYYY-MM-DD" in LOCAL time
  }, [date]);

  useEffect(() => {
    if (!isEditingAmount) setAmountStr(String(entry.amount ?? 0));
  }, [entry.amount, isEditingAmount]);

  const toolTipText = () => {
    if (isExpired) {
      if (date <= today()) {
        return (
          <p>
            Panic! <br /> This is expired
          </p>
        );
      }
      return (
        <p>
          Panic soon! <br /> This is almost expired!
        </p>
      );
    }
    return "Expiry date goes here";
  };

  // ---- handlers ----
  const onDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateStr(e.target.value); // let user type freely
  };

  const onDateBlur = async () => {
    // Empty string → clear the date field (no defaulting to today)
    if (dateStr === "") {
      // optional: only write if a date existed before
      if (entry.date) {
        try {
          await updateEntry(medId, entry.id, { date: null }); // see service change below
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }
    if (!isFullDate(dateStr)) return; // ignore partials like "2026-0"
    const next = parseDateFromInput(dateStr); // local date
    try {
      await updateEntry(medId, entry.id, { date: Timestamp.fromDate(next) });
    } catch (e) {
      console.error(e);
    }
  };
  const onAmountFocus = () => setIsEditingAmount(true);

  const onAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // allow only digits (empty string allowed)
    if (/^\d*$/.test(v)) setAmountStr(v);
  };

  const onAmountBlur = async () => {
    setIsEditingAmount(false);
    // if empty, just revert to current Firestore value
    if (amountStr === "") {
      setAmountStr(String(entry.amount ?? 0));
      return;
    }
    const n = Math.max(0, Math.floor(Number(amountStr)));
    if (!Number.isFinite(n)) {
      setAmountStr(String(entry.amount ?? 0));
      return;
    }
    if (n === (entry.amount ?? 0)) return; // no-op
    try {
      await updateEntry(medId, entry.id, { amount: n });
    } catch (err) {
      console.error("[EntryField] update amount failed:", err);
      // revert on error
      setAmountStr(String(entry.amount ?? 0));
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteEntry(medId, entry.id);
    } catch (err) {
      console.error("[EntryField] delete failed:", err);
    } finally {
      setShowModal(false);
    }
  };

  return (
    <>
      {showModal && (
        <DeleteModal
          handleClose={() => setShowModal(false)}
          onDelete={confirmDelete}
        />
      )}

      <Form>
        <Form.Group className="mb-3" controlId={`entry-${entry.id}`}>
          <InputGroup>
            {/* Date */}
            <HoverTooltip placement="left" text={toolTipText()}>
              <Form.Control
                aria-label="Expiry date"
                className={
                  isExpired
                    ? date <= today()
                      ? "w-50 bg-danger"
                      : "w-50 bg-warning"
                    : "w-50"
                }
                type="date"
                value={dateStr}
                onChange={onDateChange}
                onBlur={onDateBlur}
              />
            </HoverTooltip>

            {/* Amount */}
            <HoverTooltip text="Amount in stock goes here">
              <Form.Control
                aria-label="Quantity for this expiry date"
                className="w-25"
                type="text" // ← text to make empty string easy
                inputMode="numeric" // ← mobile numeric keypad
                pattern="[0-9]*" // ← hint for virtual keyboards
                value={amountStr}
                onFocus={onAmountFocus}
                onChange={onAmountChange}
                onBlur={onAmountBlur}
              />
            </HoverTooltip>

            {/* Delete */}
            <HoverTooltip placement="right" text="Click to delete this row">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setShowModal(true)}
              >
                <Trash />
              </Button>
            </HoverTooltip>
          </InputGroup>
        </Form.Group>
      </Form>
    </>
  );
}

function DeleteModal({
  handleClose,
  onDelete,
}: {
  handleClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal show onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Are you sure you want to delete this entry?</Modal.Title>
      </Modal.Header>
      <Modal.Footer>
        <Button variant="danger" onClick={onDelete}>
          DELETE
        </Button>
        <Button variant="primary" onClick={handleClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ---------- date utils (local, no toISOString) ---------- */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatDateForInput(d: Date) {
  // local YYYY-MM-DD
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function isFullDate(s: string) {
  // quick sanity: "YYYY-MM-DD"
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function parseDateFromInput(s: string): Date {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  // Construct *local* date
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/* ---------- numeric utils ---------- */
function clampInt(v: string | number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
