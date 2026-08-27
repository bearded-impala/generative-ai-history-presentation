import { useEffect, useEffectEvent, useState } from "react";

const DEFAULT_INTERVAL_MS = 140;

export function useCoarseReadout<T>(
  initialValue: T,
  readValue: () => T,
  intervalMs = DEFAULT_INTERVAL_MS,
): T {
  const [value, setValue] = useState(initialValue);
  const readLatest = useEffectEvent(readValue);

  useEffect(() => {
    const id = window.setInterval(() => setValue(readLatest()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return value;
}
