// src/components/common/EntryField.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";
import HoverTooltip from "./HoverTooltip";

import {
  updateEntry,
  deleteEntry,
  moveEntryDate,
  setEntryAmount,
} from "../../services/entryService";
import { EntryDoc } from "../../types/Med";
import { expiryDay, today } from "../../utils";

type Props = {
  medId: string;
  entry: EntryDoc;
};

export default function EntryField({ medId, entry }: Props) {
  // local controlled state
  const [dateStr, setDateStr] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("");
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // derive helpers
  const date = useMemo(() => entry.date?.toDate() ?? null, [entry.date]);
  const isExpired = useMemo(() => (date ? date <= expiryDay() : false), [date]);

  // initialize/sync local controls from props
  useEffect(() => {
    setDateStr(date ? formatDateForInput(date) : "");
  }, [date]);

  useEffect(() => {
    if (!isEditingAmount) setAmountStr(String(entry.amount ?? 0));
  }, [entry.amount, isEditingAmount]);

  const toolTipText = () => {
    if (isExpired) {
      if (date && date <= today()) {
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
    if (saving) return;

    // Requested new date (or blank)
    const nextIso = dateStr.trim();
    const prevIso = date ? formatDateForInput(date) : "";

    // No change → nothing to do
    if (nextIso === prevIso) return;

    setSaving(true);
    try {
      if (nextIso === "") {
        // Move to undated (creates a new auto-ID row, and deletes current doc)
        await moveEntryDate(medId, entry.id, null);
      } else if (isFullDate(nextIso)) {
        // Move to a specific date (merge if it already exists)
        const nextDate = parseDateFromInput(nextIso);
        await moveEntryDate(medId, entry.id, nextDate);
      } else {
        // invalid or partial date → revert UI to current value
        setDateStr(prevIso);
      }
    } catch (e) {
      console.error("[EntryField] moveEntryDate failed:", e);
      // revert UI
      setDateStr(prevIso);
    } finally {
      setSaving(false);
    }
  };

  const onAmountFocus = () => setIsEditingAmount(true);

  const onAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (/^\d*$/.test(v)) setAmountStr(v); // digits or empty
  };

  const onAmountBlur = async () => {
    setIsEditingAmount(false);
    if (saving) return;

    // If empty, revert to current Firestore value
    if (amountStr === "") {
      setAmountStr(String(entry.amount ?? 0));
      return;
    }

    const nextAmount = clampInt(amountStr);
    const currAmount = clampInt(entry.amount ?? 0);
    if (nextAmount === currAmount) return;

    setSaving(true);
    try {
      // If this is a dated deterministic row, use setEntryAmount with the dateKey (entry.id)
      if (isDateKey(entry.id)) {
        await setEntryAmount(medId, entry.id, nextAmount);
      } else {
        // Undated (auto-id) → just update this doc
        await updateEntry(medId, entry.id, { amount: nextAmount });
      }
    } catch (err) {
      console.error("[EntryField] update amount failed:", err);
      // revert on error
      setAmountStr(String(currAmount));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteEntry(medId, entry.id);
    } catch (err) {
      console.error("[EntryField] delete failed:", err);
    } finally {
      setSaving(false);
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
                    ? date && date <= today()
                      ? "w-50 bg-danger"
                      : "w-50 bg-warning"
                    : "w-50"
                }
                type="date"
                value={dateStr}
                onChange={onDateChange}
                onBlur={onDateBlur}
                disabled={saving}
              />
            </HoverTooltip>

            {/* Amount */}
            <HoverTooltip text="Amount in stock goes here">
              <Form.Control
                aria-label="Quantity for this expiry date"
                className="w-25"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amountStr}
                onFocus={onAmountFocus}
                onChange={onAmountChange}
                onBlur={onAmountBlur}
                disabled={saving}
              />
            </HoverTooltip>

            {/* Delete */}
            <HoverTooltip placement="right" text="Click to delete this row">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setShowModal(true)}
                disabled={saving}
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

/* ---------- date & numeric utils ---------- */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatDateForInput(d: Date) {
  // local YYYY-MM-DD
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function isFullDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function parseDateFromInput(s: string): Date {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function clampInt(v: string | number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
function isDateKey(id: string) {
  // deterministic id pattern "YYYY-MM-DD"
  return /^\d{4}-\d{2}-\d{2}$/.test(id);
}
