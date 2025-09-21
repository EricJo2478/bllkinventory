// src/components/scanning/ScanCapture.tsx
import { useCallback, useState } from "react";
import ScanModal from "./ScanModal";
import { useMedContext } from "../../contexts/MedsContext";
import { useKeyboardScanner } from "../../hooks/useKeyboardScanner";

export default function ScanCapture() {
  const { meds } = useMedContext();
  const [raw, setRaw] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const onScan = useCallback((data: string) => {
    setRaw(data);
    setOpen(true);
  }, []);

  useKeyboardScanner({
    onScan: onScan,
    prefixKey: "F9",
    suffixKey: "Enter",
  });

  return (
    <ScanModal
      show={open}
      onHide={() => setOpen(false)}
      meds={meds}
      raw={raw}
    />
  );
}
