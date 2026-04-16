export type BubbleOption = {
  label: string;
  value: string;
};

export const BUBBLES_BY_CAULDRON: {
  power: BubbleOption[];
  quicc: BubbleOption[];
  highIq: BubbleOption[];
  kazam: BubbleOption[];
} = {
  power: [],
  quicc: [],
  highIq: [],
  kazam: [{ label: "EXP", value: "ui/map/world-2/alchemy/kazam/bubble_exp" }],
};

export const CAULDRON_LABELS: Record<keyof typeof BUBBLES_BY_CAULDRON, string> =
  {
    power: "Power",
    quicc: "Quicc",
    highIq: "High-IQ",
    kazam: "Kazam",
  };
