export type CardPresetConfig = {
  slot: number;
  name: string;
  setImage?: string;
};

export const PRESET_CONFIGS: CardPresetConfig[] = [
  { slot: 1, name: "AFK", setImage: "ui/codex/cards/cards_set_spirited" },
  { slot: 2, name: "Skilling", setImage: "ui/codex/cards/cards_set_easy" },
  { slot: 3, name: "Crystal", setImage: "ui/codex/cards/cards_set_bosses" },
  { slot: 4, name: "4" },
  { slot: 5, name: "5" },
  { slot: 6, name: "6" },
  { slot: 7, name: "7" },
];
