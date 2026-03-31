import { useEffect, useState } from "react";
import type { AppState } from "@/types/scripts";

export function useMainState<K extends keyof AppState>(
  key: K
): AppState[K] | null {
  const [value, setValue] = useState<AppState[K] | null>(null);

  useEffect(() => {
    window.api.state.get(key).then(setValue);
    return window.api.state.subscribe(key, setValue);
  }, [key]);

  return value;
}
