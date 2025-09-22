// scannerCommands.ts
export type Command =
  | { type: "BTN"; which: "IN" | "OUT" | "SUBMIT" | "CANCEL" }
  | { type: "QTY"; value: number | "PKG" }
  | {
      type: "DATE";
      value:
        | { kind: "YR"; y: number }
        | { kind: "MO"; m: string } // JAN..DEC
        | { kind: "DAY"; d: number }
        | { kind: "EOM" }
        | { kind: "CLEAR" }
        | { kind: "REL"; unit: "M" | "Y"; n: number };
    }
  | { type: "CLEAR" };

const PREFIX = "SCN:";

export function parseCommand(raw: string): Command | null {
  if (!raw.startsWith(PREFIX)) return null;
  const [, kind, rest] = raw.split(":", 3); // "SCN:QTY:5"
  switch ((kind || "").toUpperCase()) {
    case "BTN": {
      const which = (rest || "").toUpperCase();
      if (["IN", "OUT", "SUBMIT", "CANCEL"].includes(which))
        return {
          type: "BTN",
          which: which as "IN" | "OUT" | "SUBMIT" | "CANCEL",
        };
      break;
    }
    case "QTY": {
      if (!rest) break;
      if (rest.toUpperCase() === "PKG") return { type: "QTY", value: "PKG" };
      const n = Number(rest);
      if (Number.isInteger(n) && n >= 0) return { type: "QTY", value: n };
      break;
    }
    case "DATE": {
      const sub = (rest[0] || "").toUpperCase();
      const arg = rest[1];

      switch (sub) {
        case "YR": {
          const n = Number(arg);
          if (Number.isFinite(n))
            return { type: "DATE", value: { kind: "YR", y: n } };
          break;
        }
        case "MO": {
          if (/^[A-Z]{3}$/.test(arg || ""))
            return { type: "DATE", value: { kind: "MO", m: arg! } };
          break;
        }
        case "DAY": {
          const d = Number(arg);
          if (Number.isInteger(d) && d >= 1 && d <= 31)
            return { type: "DATE", value: { kind: "DAY", d } };
          break;
        }
        case "EOM":
          return { type: "DATE", value: { kind: "EOM" } };
        case "CLEAR":
          return { type: "DATE", value: { kind: "CLEAR" } };
        case "+M": {
          const n = Number(arg);
          if (Number.isInteger(n) && n >= 0)
            return { type: "DATE", value: { kind: "REL", unit: "M", n } };
          break;
        }
        case "+Y": {
          const n = Number(arg);
          if (Number.isInteger(n) && n >= 0)
            return { type: "DATE", value: { kind: "REL", unit: "Y", n } };
          break;
        }
      }
    }
    case "CLEAR":
      return { type: "CLEAR" };
  }
  return null;
}
