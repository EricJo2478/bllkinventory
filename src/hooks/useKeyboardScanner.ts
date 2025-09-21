// useKeyboardScanner.ts
import { useEffect, useRef } from "react";

type Options = {
  onScan: (data: string) => void;
  prefixKey?: string; // e.g. 'F9'
  suffixKey?: string; // e.g. 'Enter'
  minLength?: number; // ignore super short scans
};

export function useKeyboardScanner({
  onScan,
  prefixKey = "F9",
  suffixKey = "Enter",
  minLength = 6,
}: Options) {
  const active = useRef(false);
  const buf = useRef("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Start capture on prefix
      if (!active.current && e.key === prefixKey) {
        active.current = true;
        buf.current = "";
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (!active.current) return; // not capturing

      // While capturing: swallow keystrokes
      if (e.key === suffixKey) {
        const s = buf.current;
        active.current = false;
        buf.current = "";
        e.preventDefault();
        e.stopPropagation();
        if (s.length >= minLength) onScan(s);
        return;
      }

      // Collect text keys only
      if (e.key.length === 1) {
        buf.current += e.key;
        e.preventDefault();
        e.stopPropagation();
      } else {
        // ignore other control keys while capturing
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // capture phase so we beat input elements
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onScan, prefixKey, suffixKey, minLength]);
}
