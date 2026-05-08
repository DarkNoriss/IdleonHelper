import type { RawJson } from "../types/raw-json";

export type EmperorData = {
  attempts: number;
};

// Mirrors IdleonToolbox's parser: `Math.round(-1 * (OptLacc[370] - 1))`.
// The save stores remaining attempts as `1 - n` (e.g. n=11 attempts -> -10).
const ATTEMPTS_INDEX = 370;

const getData = (jsonData: RawJson): RawJson["data"] => {
  const candidate = jsonData as unknown as { data?: RawJson["data"] };
  if (
    candidate.data &&
    typeof candidate.data === "object" &&
    !Array.isArray(candidate.data)
  ) {
    return candidate.data;
  }
  return jsonData as unknown as RawJson["data"];
};

const parseOptLacc = (raw: unknown): unknown[] | null => {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

export const parseEmperor = (jsonData: RawJson | null): EmperorData | null => {
  if (!jsonData) {
    return null;
  }
  const optLacc = parseOptLacc(getData(jsonData).OptLacc);
  if (!optLacc) {
    return null;
  }
  const counter = optLacc[ATTEMPTS_INDEX];
  if (typeof counter !== "number") {
    return null;
  }
  const attempts = Math.max(0, Math.round(-1 * (counter - 1)));
  return { attempts };
};
