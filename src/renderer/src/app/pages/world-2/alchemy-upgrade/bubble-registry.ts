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
  power: [
    {
      label: "Roid Ragin",
      value: "ui/map/world-2/alchemy/power/roid_ragin",
    },
    {
      label: "Warriors Rule",
      value: "ui/map/world-2/alchemy/power/warriors_rule",
    },
    {
      label: "Hearty Diggy",
      value: "ui/map/world-2/alchemy/power/hearty_diggy",
    },
  ],
  quicc: [
    {
      label: "Swift Steppin",
      value: "ui/map/world-2/alchemy/quicc/swift_steppin",
    },
    {
      label: "Archer Or Bust",
      value: "ui/map/world-2/alchemy/quicc/archer_or_bust",
    },
  ],
  highIq: [
    {
      label: "Stable Jenius",
      value: "ui/map/world-2/alchemy/high-iq/stable_jenius",
    },
    {
      label: "Mage Is Best",
      value: "ui/map/world-2/alchemy/high-iq/mage_is_best",
    },
    {
      label: "Cookin Roadkill",
      value: "ui/map/world-2/alchemy/high-iq/cookin_roadkill",
    },
  ],
  kazam: [
    { label: "EXP", value: "ui/map/world-2/alchemy/kazam/bubble_exp" },
    {
      label: "Startue EXP",
      value: "ui/map/world-2/alchemy/kazam/startue_exp",
    },
    {
      label: "Prowesessary",
      value: "ui/map/world-2/alchemy/kazam/prowesessary",
    },
  ],
};

export const CAULDRON_LABELS: Record<keyof typeof BUBBLES_BY_CAULDRON, string> =
  {
    power: "Power",
    quicc: "Quicc",
    highIq: "High-IQ",
    kazam: "Kazam",
  };
