import React, { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";
import bwipjs from "bwip-js";

/** Compact command sheet that fits many codes on 1–2 pages. */

const PREFIX = "MED:";

// Tweak your command sets here:
const sections: { title: string; items: { label: string; value: string }[] }[] =
  [
    {
      title: "Meds",
      items: [
        { label: "1000mL NS", value: "1000mLNS" },
        { label: "50mL NS", value: "50mLNS" },
        { label: "Activated Charcoal", value: "Charcoal" },
        { label: "Adenosine", value: "Adenosine" },
        { label: "Adult Pads", value: "AdultPads" },
        { label: "Advil Peds", value: "AdvilPeds" },
        { label: "Amiodarone", value: "Amiodarone" },
        { label: "ASA", value: "ASA" },
        { label: "Atropine", value: "Atropine" },
        { label: "Atrovent MDI", value: "AtroventMDI" },
        { label: "Atrovent NEB", value: "AtroventNEB" },
        { label: "Benadryl", value: "Benadryl" },
        { label: "Calcium Chloride", value: "CaCl" },
        { label: "Ceftriaxone", value: "Ceftriaxone" },
        { label: "D10W", value: "D10W" },
        { label: "Dex4 Tabs", value: "Dex4" },
        { label: "Dexamethsone", value: "Dexamethsone" },
        { label: "Epi", value: "Epi" },
        { label: "Glucagon", value: "Glucagon" },
        { label: "Glucose Buccal", value: "GlucoseBuccal" },
        { label: "Gravol", value: "Gravol" },
        { label: "Haloperidol", value: "Haloperidol" },
        { label: "Lidocaine Preload", value: "LidocainePreload" },
        { label: "Lidocaine Spray", value: "LidocaineSpray" },
        { label: "Magnesium", value: "Magnesium" },
        { label: "Naproxen", value: "Naproxen" },
        { label: "Narcan", value: "Narcan" },
        { label: "Nitro", value: "Nitro" },
        { label: "Norepi", value: "Norepi" },
        { label: "Oxytocin", value: "Oxytocin" },
        { label: "Peds Pads", value: "PedsPads" },
        { label: "Sodium Bicarb", value: "SodiumBicarb" },
        { label: "Solu-Medrol", value: "SoluMedrol" },
        { label: "Toradol", value: "Toradol" },
        { label: "TXA", value: "TXA" },
        { label: "Tylenol Infant", value: "TylenolInf" },
        { label: "Tylenol Peds", value: "TylenolPeds" },
        { label: "Tylenol PO", value: "TylenolPO" },
        { label: "Tylenol PR 325mg", value: "Tylenol325" },
        { label: "Tylenol PR 120mg", value: "Tylenol120" },
        { label: "Ventolin MDI", value: "VentolinMDI" },
        { label: "Ventolin NEB", value: "VentolinNEB" },
        { label: "Vitamin B", value: "VitaminB" },
        { label: "Zofran INJ", value: "ZofranINJ" },
        { label: "Zofran PO", value: "ZofranPO" },
      ],
    },
  ];

type Symbology = "datamatrix" | "qr" | "code128";

/** Renders a Data Matrix barcode into a canvas (ultra compact). */
function DataMatrix({ value, size }: { value: string; size: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      bwipjs.toCanvas(ref.current, {
        bcid: "datamatrix", // Data Matrix
        text: value,
        scale: 3, // module
        paddingwidth: 2,
        paddingheight: 2,
        includetext: false, // no human-readable text
      });
      // Scale canvas visually to our target size
      ref.current.style.width = `${size}px`;
      ref.current.style.height = `${size}px`;
      ref.current.style.display = "block";
    } catch (e) {
      console.error("DataMatrix render error", e);
    }
  }, [value, size]);
  return <canvas ref={ref} />;
}

/** Renders a Code-128 into an SVG, compact (no text). */
function Code128({ value, width }: { value: string; width: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        width: 1.6, // narrow bars
        height: 44, // small height
        displayValue: false,
        margin: 6,
      });
      ref.current.setAttribute("preserveAspectRatio", "xMidYMid meet");
      ref.current.style.maxWidth = "100%";
      ref.current.style.width = `${width}px`;
      ref.current.style.height = "auto";
      ref.current.style.display = "block";
    } catch (e) {
      console.error("Code128 render error", e);
    }
  }, [value, width]);
  return <svg ref={ref} />;
}

function Chip({
  label,
  payload,
  symbology,
  size,
}: {
  label: string;
  payload: string;
  symbology: Symbology;
  size: number; // px
}) {
  const full = useMemo(() => `${PREFIX}${payload}`, [payload]);

  return (
    <div className="chip">
      <div className="chip-label">{label}</div>
      <div className="chip-code" style={{ width: size, height: size }}>
        {symbology === "datamatrix" && <DataMatrix value={full} size={size} />}
        {symbology === "qr" && (
          <QRCodeSVG value={full} size={size} includeMargin={false} />
        )}
        {symbology === "code128" && <Code128 value={full} width={size} />}
      </div>
      {/* tiny raw under for debugging; comment out to save more space */}
      {/* <div className="chip-raw">{full}</div> */}
    </div>
  );
}

export default function MedBarcodeSheetCompact() {
  const [symbology, setSymbology] = useState<Symbology>("datamatrix");
  const [size, setSize] = useState<number>(110); // code square width/height

  return (
    <div className="sheet">
      <div className="toolbar no-print">
        <h1>Command Codes</h1>
        <div className="controls">
          <label>
            Symbology:&nbsp;
            <select
              value={symbology}
              onChange={(e) => setSymbology(e.target.value as Symbology)}
            >
              <option value="datamatrix">Data Matrix (most compact)</option>
              <option value="qr">QR</option>
              <option value="code128">Code-128</option>
            </select>
          </label>
          <label>
            Size:&nbsp;
            <input
              type="range"
              min={80}
              max={160}
              step={5}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value, 10))}
            />
            &nbsp;<span>{size}px</span>
          </label>
          <button onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {sections.map((sec) => (
        <section key={sec.title} className="section">
          <h2>{sec.title}</h2>
          <div className="grid">
            {sec.items.map((it) => (
              <Chip
                key={sec.title + it.value}
                label={it.label}
                payload={it.value}
                symbology={symbology}
                size={size}
              />
            ))}
          </div>
        </section>
      ))}

      <style>{css}</style>
    </div>
  );
}

const css = `
:root {
  --gap: 8px;
  --border: #e5e7eb;
  --muted: #6b7280;
  --label: #111827;
  --radius: 10px;
  --pad: 8px;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
.sheet { padding: 12px; background: #fff; }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.toolbar h1 { margin: 0; font-size: 18px; }
.controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.controls select, .controls input[type="range"], .controls button { padding: 4px 6px; }
.controls button { border-radius: 8px; border: 1px solid var(--border); background: #fff; cursor: pointer; }

.section { break-inside: avoid; page-break-inside: avoid; margin: 10px 0; }
.section h2 { font-size: 14px; margin: 8px 0; color: #374151; }

.grid {
  display: grid;
  /* auto-fit as many chips as will fit, min width bound by size + padding */
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--gap);
}

.chip {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--pad);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #fff;
}

.chip-label { font-weight: 600; color: var(--label); font-size: 12px; text-align: center; }

/* barcode area; square container for QR/DM; Code-128 scales horizontally */
.chip-code {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.chip-raw {
  font-size: 10px;
  color: var(--muted);
  text-align: center;
  word-break: break-word;
}

/* Print tight */
@media print {
  .no-print { display: none !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { padding: 6px; }
  .grid { gap: 6px; }
  .chip { padding: 6px; }
}
`;
