// src/components/scanning/ScanModal.tsx
import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, InputGroup, Badge } from "react-bootstrap";
import { Timestamp } from "firebase/firestore";
import { MedDoc } from "../../types/Med";
import { ParsedScan, parseScan } from "../../services/barcode";
import {
  addEntry,
  addOrIncrementEntry,
  consumeFromEntries,
} from "../../services/entryService";

type Props = {
  show: boolean;
  onHide: () => void;
  // supply your full med list (from MedContext) to resolve barcodes
  meds: MedDoc[];
  // the raw scanned string
  raw: string | null;
};

export default function ScanModal({ show, onHide, meds, raw }: Props) {
  const parsed = useMemo<ParsedScan | null>(
    () => (raw ? parseScan(raw) : null),
    [raw]
  );

  // Resolve to a med (by GS1 GTIN or plain barcode matches your stored fields)
  const candidates = useMemo(() => {
    if (!parsed) return [];
    const code = parsed.type === "gs1" ? parsed.gtin ?? "" : parsed.raw;
    if (!code) return [];
    // your MedDoc might store barcodes like: { gtin?: string; unitBarcodes?: string[]; packBarcodes?: string[]; }
    return meds.filter(
      (m) =>
        m.gtin === code ||
        m.unitBarcodes?.includes(code) ||
        m.packBarcodes?.includes(code) ||
        m.barcodes?.includes?.(code)
    );
  }, [parsed, meds]);

  const [medId, setMedId] = useState<string | null>(null);
  const [qtyStr, setQtyStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  // prefill based on parsed + med info (e.g., pack barcode → pkg)
  useEffect(() => {
    if (!parsed) return;
    // date
    if (parsed.type === "gs1" && parsed.expiry) {
      setDateStr(formatDate(parsed.expiry));
    } else {
      setDateStr(""); // start blank if no expiry in code
    }
    // qty default: if pack barcode matched, you could set med.pkg later after med pick
    setQtyStr("1");
  }, [parsed]);

  // default med if exactly one match
  useEffect(() => {
    if (candidates.length === 1) setMedId(candidates[0].id);
  }, [candidates]);

  const selected = meds.find((m) => m.id === medId);

  useEffect(() => {
    // If the scanned code matched a "pack" barcode on the selected med, default to pkg size
    if (!selected) return;
    if (parsed?.type === "plain") {
      const code = parsed.raw;
      const isPack = selected.packBarcodes?.includes?.(code);
      if (isPack && selected.pkg && !isNaN(selected.pkg as any)) {
        setQtyStr(String(selected.pkg));
      }
    }
  }, [selected, parsed]);

  const qty = parseInt(qtyStr || "0", 10);
  const validQty = Number.isFinite(qty) && qty >= 0;
  const validDate = dateStr === "" || /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  async function doSignIn() {
    if (!selected || !validQty) return;
    const date = dateStr ? Timestamp.fromDate(parseDate(dateStr)) : undefined;
    await addOrIncrementEntry(selected.id, { amount: qty, date });
    onHide();
  }

  async function doSignOut() {
    if (!selected || !validQty) return;
    // consume from earliest expiry first
    await consumeFromEntries(selected.id, qty);
    onHide();
  }

  return (
    <Modal show={show} onHide={onHide} backdrop="static" keyboard>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          Scan
          {parsed?.type === "gs1" && <Badge bg="secondary">GS1</Badge>}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Med selector (auto-chosen if single match) */}
        <Form.Group className="mb-3">
          <Form.Label>Medication</Form.Label>
          <Form.Select
            value={medId ?? ""}
            onChange={(e) => setMedId(e.target.value || null)}
          >
            <option value="" disabled>
              Select a medication
            </option>
            {candidates.length > 0
              ? candidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              : meds.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
          </Form.Select>
        </Form.Group>

        {/* Qty + Date */}
        <InputGroup className="mb-3">
          <InputGroup.Text>Qty</InputGroup.Text>
          <Form.Control
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qtyStr}
            onChange={(e) =>
              /^\d*$/.test(e.target.value) && setQtyStr(e.target.value)
            }
          />
          <InputGroup.Text>Expiry</InputGroup.Text>
          <Form.Control
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </InputGroup>

        {/* Raw code (debug) */}
        {raw && (
          <div className="text-muted small">
            Scanned: <code>{raw}</code>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={doSignOut}
          disabled={!selected || !validQty}
        >
          Sign Out
        </Button>
        <Button
          variant="primary"
          onClick={doSignIn}
          disabled={!selected || !validQty || !validDate}
        >
          Sign In
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDate(s: string) {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
