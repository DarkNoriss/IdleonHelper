export type Selections = {
  power: string[];
  quicc: string[];
  highIq: string[];
  kazam: string[];
};

export type Cauldron = "power" | "quicc" | "highIq" | "kazam";

export const CAULDRON_ORDER: readonly Cauldron[] = [
  "power",
  "quicc",
  "highIq",
  "kazam",
] as const;

// IdleonToolbox layout: 25 bubbles per cauldron, indexed 0..99 across all
// cauldrons. Verified during impl against real CauldronInfo shape; update
// here if a cauldron has a different capacity.
export const BUBBLES_PER_CAULDRON = 25;
export const CAULDRON_FLAT_OFFSET: Record<Cauldron, number> = {
  power: 0,
  quicc: 25,
  highIq: 50,
  kazam: 75,
};

export type BubbleRef = {
  name: string;
  cauldron: Cauldron;
  indexInCauldron: number;
  flatIndex: number;
};

export type PrismaMultiplier = {
  value: number;
  breakdown: {
    tesseract: number;
    arcade: number;
    sushi: number;
    trophy: number;
    palette: number;
    etherealSigils: number;
    exoticMarket: number;
    legendTalent: number;
    companion: number;
  };
  missing: string[];
};

export type AlchemyData = {
  prismaFragments: number;
  prismaticBubbleFlatIndices: ReadonlySet<number>;
  bubbleLevels: number[][];
  prismaMultiplier: PrismaMultiplier;
};
