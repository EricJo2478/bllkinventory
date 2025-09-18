// src/services/barcode.ts
// Small helpers to parse GS1 and simple 1D codes

export type ParsedScan =
  | {
      type: "gs1";
      raw: string;
      gtin?: string;
      expiry?: Date;
      lot?: string | null;
      serial?: string | null;
      ai: Record<string, string>;
    }
  | { type: "plain"; raw: string };

const GS = String.fromCharCode(29); // ASCII 29 (FNC1 group separator)

/**
 * Detect/parse GS1 string.
 * Accepts ]d2 prefix and embedded GS separators.
 * Supports (01) GTIN, (17) expiry (YYMMDD), (10) lot, (21) serial.
 */
export function parseGs1(rawIn: string): ParsedScan | null {
  let s = rawIn.trim();

  // Common FNC1 prefixes from scanners for DataMatrix/QR
  if (s.startsWith("]d2") || s.startsWith("]C1") || s.startsWith("]Q3")) {
    s = s.slice(3);
  }

  // Replace visible <GS> placeholders that some scanners send
  s = s.replace(/\u001D/g, GS);

  // Quick check: must contain AIs like (01) or start with digits that match AI
  if (!/[()]/.test(s) && !s.startsWith("01") && !s.includes(GS)) {
    return null;
  }

  // Tokenize AIs: either (AI)VALUE or compact AIs w/ GS separators
  // Simple robust parser: walk string extracting "(NN)" + value until next "(" or GS
  const ai: Record<string, string> = {};
  let i = 0;
  while (i < s.length) {
    if (s[i] === "(") {
      const j = s.indexOf(")", i + 1);
      if (j < 0) break;
      const aiCode = s.slice(i + 1, j);
      i = j + 1;
      // read value until next "(" or GS or end
      let k = i;
      while (k < s.length && s[k] !== "(" && s[k] !== GS) k++;
      const val = s.slice(i, k);
      ai[aiCode] = val;
      i = s[k] === GS ? k + 1 : k;
    } else {
      // compact without parens: AI codes are 2-4 digits; assume 2 here for brevity
      // e.g., "011012345678901717241231" with GS separators between variable-length AIs
      // You can extend if your scanners send compact format.
      // If this path is hit and we can’t reliably parse, bail out.
      return null;
    }
  }

  if (Object.keys(ai).length === 0) return null;

  const gtin = ai["01"];
  const expiry = ai["17"] ? parseGtinDate(ai["17"]) : undefined;
  const lot = ai["10"] ?? null;
  const serial = ai["21"] ?? null;

  return { type: "gs1", raw: rawIn, gtin, expiry, lot, serial, ai };
}

function parseGtinDate(yyMMdd: string): Date | undefined {
  if (!/^\d{6}$/.test(yyMMdd)) return;
  const yy = parseInt(yyMMdd.slice(0, 2), 10);
  const mm = parseInt(yyMMdd.slice(2, 4), 10);
  const dd = parseInt(yyMMdd.slice(4, 6), 10);
  const year = 2000 + yy; // GS1 YY 00..99 → 2000..2099
  const d = new Date(year, (mm || 1) - 1, dd || 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseScan(raw: string): ParsedScan {
  const gs1 = parseGs1(raw);
  return gs1 ?? { type: "plain", raw };
}
