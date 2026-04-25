import { useEffect, useState } from "react";

// Re-renders once per second so callers can format a "X ago" stamp from a
// fixed lastUpdated timestamp without holding their own interval.
export const useTickingAge = (lastUpdatedMs: number | null): number | null => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (lastUpdatedMs == null) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastUpdatedMs]);
  return lastUpdatedMs == null ? null : now - lastUpdatedMs;
};
