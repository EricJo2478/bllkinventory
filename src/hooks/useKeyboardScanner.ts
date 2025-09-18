// src/hooks/useKeyboardScanner.ts
import { useEffect, useRef } from "react";

type Options = {
  onScan: (data: string) => void;
  minLength?: number; // ignore very short bursts
  timeoutMs?: number; // end-of-scan timeout if no Enter key
};

export function useKeyboardScanner({
  onScan,
  minLength = 6,
  timeoutMs = 50,
}: Options) {
  const buf = useRef<string>("");
  const lastTs = useRef<number>(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore if user is typing into an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement)?.isContentEditable;

      const now = performance.now();
      const fast = now - (lastTs.current || 0) < 30; // scanners blast fast (<30ms)
      lastTs.current = now;

      // reset buffer if pause is long
      if (now - lastTs.current > 300) buf.current = "";

      if (e.key === "Enter") {
        const s = buf.current;
        buf.current = "";
        if (s.length >= minLength) onScan(s);
        return;
      }

      if (!isTyping && fast && e.key.length === 1) {
        buf.current += e.key;
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          const s = buf.current;
          buf.current = "";
          if (s.length >= minLength) onScan(s);
        }, timeoutMs);
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onScan, minLength, timeoutMs]);
}
