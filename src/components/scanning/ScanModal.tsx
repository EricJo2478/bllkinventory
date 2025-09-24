// src/components/scanning/ScanModal.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Modal, Button, Form, InputGroup, Badge } from "react-bootstrap";
import type { MedDoc } from "../../types/Med";
import type { ParsedScan } from "../../services/barcode";
import { parseScan } from "../../services/barcode";
import {
  addOrIncrementEntry,
  consumeFromEntries,
} from "../../services/entryService";
import type { Command } from "../../services/scannerCommands";
import { parseCommand } from "../../services/scannerCommands";

type Props = {
  show: boolean;
  onHide: () => void;
  meds: MedDoc[];
  raw: string | null; // latest scanned string (command or product)
};

export default function ScanModal({ show, onHide, meds, raw }: Props) {
  const [medId, setMedId] = useState<string | null>(null);
  const [qtyStr, setQtyStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>(""); // ISO yyyy-mm-dd

  // Parse product scans (commands handled separately)
  const parsed = useMemo<ParsedScan | null>(
    () => (raw ? parseScan(raw) : null),
    [raw]
  );

  // Candidate meds based on parsed code
  const candidates = useMemo(() => {
    if (!parsed) return [];
    const code = parsed.type === "gs1" ? parsed.gtin ?? "" : parsed.raw;
    if (!code) return [];
    return meds.filter(
      (m) =>
        m.gtin === code ||
        m.unitBarcodes?.includes(code) ||
        m.packBarcodes?.includes(code) ||
        m.barcodes?.includes(code)
    );
  }, [parsed, meds]);

  const selected = useMemo(
    () => meds.find((m) => m.id === medId),
    [meds, medId]
  );

  // ----- Command handling (qty/date/buttons) -----
  const applyCommand = useCallback(
    (cmd: Command) => {
      if (cmd.type === "QTY") {
        if (cmd.value === "PKG") {
          if (selected?.pkg) setQtyStr(String(selected.pkg));
        } else {
          setQtyStr(String(cmd.value));
        }
        return;
      }

      if (cmd.type === "DATE") {
        const v: any = cmd.value;
        if (v === "TODAY") {
          setDateStr(formatDate(new Date()));
          return;
        }
        if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          setDateStr(v);
          return;
        }
        if (typeof v === "string" && /^\+\d+$/.test(v)) {
          const n = parseInt(v.slice(1), 10);
          const d = new Date();
          d.setDate(d.getDate() + n);
          setDateStr(formatDate(d));
          return;
        }
        if (v === "CLEAR") {
          setDateStr("");
          return;
        }
        return;
      }

      if (cmd.type === "BTN") {
        if (cmd.which === "IN") return void doSignIn();
        if (cmd.which === "OUT") return void doSignOut();
        if (cmd.which === "CANCEL") return onHide();
        if (cmd.which === "SUBMIT") return void doSignIn();
      }
    },
    [selected, onHide] // setters are stable
  );

  // React to each new raw scan:
  // - Commands handled here (don’t affect selection).
  // - Product scans preset date/qty defaults.
  useEffect(() => {
    if (!raw) return;
    const cmd = parseCommand(raw);
    if (cmd) {
      applyCommand(cmd);
      return;
    }
    // Product scan: prefill
    if (parsed?.type === "gs1" && parsed.expiry) {
      setDateStr(formatDate(parsed.expiry));
    } else {
      setDateStr(""); // start blank when no expiry in barcode
    }
    setQtyStr("1");
  }, [raw, parsed, applyCommand]);

  // Selection logic:
  // - Command scans → no change.
  // - Product with exactly 1 match → select it.
  // - Otherwise (0 or >1) → clear.
  useEffect(() => {
    if (!raw) return;
    const cmd = parseCommand(raw);
    if (cmd) return;
    if (candidates.length === 1) setMedId(candidates[0].id);
    else setMedId(null);
  }, [raw, candidates]);

  // If a plain pack barcode matched the selected med, default qty to pkg size
  useEffect(() => {
    if (!selected) return;
    if (parsed?.type === "plain") {
      const code = parsed.raw;
      const isPack = selected.packBarcodes?.includes?.(code);
      if (isPack && selected.pkg && !Number.isNaN(selected.pkg as any)) {
        setQtyStr(String(selected.pkg));
      }
    }
  }, [selected, parsed]);

  // ----- Actions -----
  const qty = parseInt(qtyStr || "0", 10);
  const validQty = Number.isFinite(qty) && qty >= 0;
  const validDate = dateStr === "" || /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  async function doSignIn() {
    if (!selected || !validQty) return;

    // IMPORTANT: pass a JS Date (local midnight from ISO) or null.
    // Your deterministic-ID addOrIncrementEntry will:
    //  - coalesce & increment for dated (entries/YYYY-MM-DD)
    //  - create a new auto-ID doc for undated
    const date = dateStr ? parseDate(dateStr) : null;

    await addOrIncrementEntry(selected.id, {
      amount: qty,
      date, // Date or null — service handles increment/merge
    });

    onHide();
  }

  async function doSignOut() {
    if (!selected || !validQty) return;
    await consumeFromEntries(selected.id, qty);
    onHide();
  }

  // ----- Render -----
  return (
    <Modal show={show} onHide={onHide} backdrop="static" keyboard>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          Scan
          {parsed?.type === "gs1" && <Badge bg="secondary">GS1</Badge>}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
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
              ? candidates
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((m) => (
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

          {/* Unknown / ambiguous product barcode hints */}
          {raw && !parseCommand(raw) && parsed && candidates.length === 0 && (
            <div className="text-danger small mt-2">
              Unknown barcode. Please select a medication.
            </div>
          )}
          {raw && !parseCommand(raw) && parsed && candidates.length > 1 && (
            <div className="text-warning small mt-2">
              Multiple matches. Please pick the correct medication.
            </div>
          )}
        </Form.Group>

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

// ------- helpers -------
function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(iso: string) {
  // ISO (yyyy-mm-dd) -> Date at local midnight
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
