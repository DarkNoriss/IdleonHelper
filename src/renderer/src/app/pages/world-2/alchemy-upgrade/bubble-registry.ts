export type BubbleOption = {
  label: string;
  value: string;
};

// Entries added once the operator harvests HSV templates using the debug tool.
// Each `value` is the asset path (without extension) under resources/assets/.
export const BUBBLES_BY_CAULDRON: {
  power: BubbleOption[];
  quicc: BubbleOption[];
  highIq: BubbleOption[];
  kazam: BubbleOption[];
} = {
  power: [],
  quicc: [],
  highIq: [],
  kazam: [],
};

export const CAULDRON_LABELS: Record<keyof typeof BUBBLES_BY_CAULDRON, string> =
  {
    power: "Power",
    quicc: "Quicc",
    highIq: "High-IQ",
    kazam: "Kazam",
  };
