import type { SushiStationData } from "@/types/sushi-station";
import {
  computeUniqueSushi,
  type ExternalSources,
  knowledgeBonusTotals,
  rogBonusQTY,
  SUSHI_UPG,
} from "./sushi-station-formulas";

export function parseSushiStation(
  parsedJson: unknown
): SushiStationData | null {
  if (!parsedJson || typeof parsedJson !== "object") {
    return null;
  }

  // Raw JSON may be wrapped (`{ data: {...} }`) or flat. Mirror the getData()
  // pattern from construction.ts / boss-farmer.ts.
  const candidate = parsedJson as Record<string, unknown>;
  const dataCandidate = candidate.data;
  const root: Record<string, unknown> =
    dataCandidate &&
    typeof dataCandidate === "object" &&
    !Array.isArray(dataCandidate)
      ? (dataCandidate as Record<string, unknown>)
      : candidate;

  // 1. Sushi: string-or-already-parsed (open issue #4)
  const sushi = parseArrayValue(root.Sushi);
  if (!Array.isArray(sushi)) {
    return null; // hard requirement -- no Sushi means no optimizer
  }

  // 2. upgradeLevels: Sushi[2], length matches SUSHI_UPG
  const ulRaw = sushi[2];
  if (!Array.isArray(ulRaw)) {
    return null;
  }
  const upgradeLevels: number[] = SUSHI_UPG.map(
    (_, i) => Number(ulRaw[i] ?? 0) || 0
  );

  // 3. bucks (Sushi[4][3]) and sparks (Sushi[4][2])
  const meta = sushi[4];
  const bucks = Array.isArray(meta) ? Number(meta[3] ?? 0) || 0 : 0;
  const sparks = Array.isArray(meta) ? Number(meta[2] ?? 0) || 0 : 0;

  // 4. researchLevel: max of Lv0_<i>[20] across all chars 0..9 (open issue #5)
  let researchLevel = 0;
  for (let i = 0; i < 10; i++) {
    const lv0 = parseArrayValue(root[`Lv0_${i}`]);
    if (Array.isArray(lv0)) {
      researchLevel = Math.max(researchLevel, Number(lv0[20] ?? 0) || 0);
    }
  }

  // 5. hasBundleV: BundlesReceived.bon_v (open issue #2 -- real parse)
  const bundlesRaw = parsePassthrough(root.BundlesReceived);
  const hasBundleV = Boolean(
    bundlesRaw &&
      typeof bundlesRaw === "object" &&
      !Array.isArray(bundlesRaw) &&
      (bundlesRaw as Record<string, unknown>).bon_v
  );

  // 6. Derived from sushi save data
  const rawSushiData: unknown = sushi;
  const knowledgeTotals = knowledgeBonusTotals(rawSushiData);
  const knowledgeCat6Total = Number(knowledgeTotals[6] ?? 0) || 0;

  // 7. rogBonus26 from uniqueSushi count
  const uniqueSushi = computeUniqueSushi(rawSushiData);
  const rogBonus26 = rogBonusQTY(26, uniqueSushi);

  // 8. ExternalSources -- hasBundleV from real save, rest stubbed to 0
  //    (per port-source.md open issue #2: lower-bound estimates; future tickets
  //    can wire arcade67/atom14/sailing39/etc. once those parsers exist)
  const externalSources: ExternalSources = {
    hasBundleV,
    atom14: 0,
    sailing39: 0,
    arcade67: 0,
    gridBonus189: 0,
    mineheadBonus11: 0,
    gamingSuperBit67: 0,
    buttonBonus2: 0,
  };

  return {
    upgradeLevels,
    bucks,
    researchLevel,
    knowledgeCat6Total,
    rogBonus26,
    rawSushiData,
    hasBundleV,
    sparks,
    externalSources,
  };
}

// Parses a value that may be a JSON string or an already-parsed array.
// Returns the parsed array, the existing value if already an array, or null.
// Mirrors the inline pattern from construction.ts / boss-farmer.ts.
function parseArrayValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

// Parses a value that may be a JSON string or an already-parsed object/array.
// Used for non-array values like BundlesReceived (plain object).
function parsePassthrough(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}
