import {
  type AlchemyData,
  BUBBLES_PER_CAULDRON,
  CAULDRON_FLAT_OFFSET,
  CAULDRON_ORDER,
  type Cauldron,
} from "@/types/alchemy";

const PRISMA_FRAGMENTS_INDEX = 383;
const PRISMA_BUBBLES_INDEX = 384;

export function parseAlchemy(parsedJson: unknown): AlchemyData | null {
  if (!parsedJson || typeof parsedJson !== "object") {
    return null;
  }

  const candidate = parsedJson as Record<string, unknown>;
  const dataCandidate = candidate.data;
  const root: Record<string, unknown> =
    dataCandidate &&
    typeof dataCandidate === "object" &&
    !Array.isArray(dataCandidate)
      ? (dataCandidate as Record<string, unknown>)
      : candidate;

  const accountOptions = parseArrayValue(root.OptLacc);
  if (!Array.isArray(accountOptions)) {
    return null;
  }

  const prismaFragments = toNumber(accountOptions[PRISMA_FRAGMENTS_INDEX]);
  const prismaticBubbleFlatIndices = parsePrismaticCsv(
    accountOptions[PRISMA_BUBBLES_INDEX]
  );
  const bubbleLevels = parseBubbleLevels(root.CauldronInfo);

  return {
    prismaFragments,
    prismaticBubbleFlatIndices,
    bubbleLevels,
    prismaMultiplier: {
      value: 2,
      breakdown: {
        tesseract: 0,
        arcade: 0,
        sushi: 0,
        trophy: 0,
        palette: 0,
        etherealSigils: 0,
        exoticMarket: 0,
        legendTalent: 0,
        companion: 0,
      },
      missing: ["multiplier-not-implemented"],
    },
  };
}

function parsePrismaticCsv(raw: unknown): ReadonlySet<number> {
  if (typeof raw !== "string") {
    return new Set();
  }
  // Save format: "0,1,5," (trailing comma is intentional).
  const parts = raw.split(",");
  const out = new Set<number>();
  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }
    const n = Number(part);
    if (Number.isFinite(n)) {
      out.add(n);
    }
  }
  return out;
}

function parseBubbleLevels(raw: unknown): number[][] {
  const arr = parseArrayValue(raw);
  if (!Array.isArray(arr)) {
    return CAULDRON_ORDER.map(() => emptyCauldronLevels());
  }
  return CAULDRON_ORDER.map((_, idx) => {
    const row = arr[idx];
    if (!Array.isArray(row)) {
      return emptyCauldronLevels();
    }
    const out: number[] = [];
    for (let i = 0; i < BUBBLES_PER_CAULDRON; i++) {
      out.push(toNumber(row[i]));
    }
    return out;
  });
}

function emptyCauldronLevels(): number[] {
  return Array.from({ length: BUBBLES_PER_CAULDRON }, () => 0);
}

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

function toNumber(value: unknown): number {
  return Number(value ?? 0) || 0;
}

// Re-exported for the page so it can map (cauldron, idx) to flat index without
// importing constants in two places.
export function getFlatIndex(
  cauldron: Cauldron,
  indexInCauldron: number
): number {
  return CAULDRON_FLAT_OFFSET[cauldron] + indexInCauldron;
}
