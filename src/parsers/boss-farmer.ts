import type { RawJson } from "../types/raw-json";

export type BossFarmerData = {
  gemBossKillsRemaining: number;
};

const GEM_BOSS_INDEX = 195;
const GEM_BOSS_DAILY_CAP = 600;
const GEM_BOSS_INCREMENT = 4;

// Raw JSON may be wrapped (`{ data: {...} }`) or flat (`{ OptLacc, ... }`).
// Mirrors the helper in `construction.ts` — duplicated locally; hoist to a
// shared module only when a third parser needs it.
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

export const parseBossFarmer = (
  jsonData: RawJson | null
): BossFarmerData | null => {
  if (!jsonData) {
    return null;
  }
  const optLacc = parseOptLacc(getData(jsonData).OptLacc);
  if (!optLacc) {
    return null;
  }
  const counter = optLacc[GEM_BOSS_INDEX];
  if (typeof counter !== "number") {
    return null;
  }
  const remaining = Math.max(
    0,
    Math.floor((GEM_BOSS_DAILY_CAP - counter) / GEM_BOSS_INCREMENT)
  );
  return { gemBossKillsRemaining: remaining };
};
