import type { Point } from "@/types/backend-types";

export type Card = {
  cardName: string;
  cardImage: string;
};

export type CardCategory = {
  categoryName: string;
  categoryImage: string;
  cards: Card[];
};

export const CARD_CATEGORY_TOP: Point = { x: 471, y: 173 };
export const CARD_CATEGORY_BOTTOM: Point = { x: 486, y: 491 };

export const CARD_CATEGORIES: CardCategory[] = [
  {
    categoryName: "Blunder Hills",
    categoryImage: "codex/cards/cards_blunder_hills",
    cards: [],
  },
  {
    categoryName: "Yum-Yum Desert",
    categoryImage: "codex/cards/cards_yum_yum_desert",
    cards: [],
  },
  {
    categoryName: "Easy Resources",
    categoryImage: "codex/cards/cards_easy_resources",
    cards: [],
  },
  {
    categoryName: "Medium Resources",
    categoryImage: "codex/cards/cards_medium_resources",
    cards: [],
  },
  {
    categoryName: "Frostbite Tundra",
    categoryImage: "codex/cards/cards_frostbite_tundra",
    cards: [],
  },
  {
    categoryName: "Hard Resources",
    categoryImage: "codex/cards/cards_hard_resources",
    cards: [],
  },
  {
    categoryName: "Hyperion Nebula",
    categoryImage: "codex/cards/cards_hyperion_nebula",
    cards: [],
  },
  {
    categoryName: "Smolderin' Plateau",
    categoryImage: "codex/cards/cards_smolderin_plateau",
    cards: [],
  },
  {
    categoryName: "Spirited Valley",
    categoryImage: "codex/cards/cards_spirited_valley",
    cards: [],
  },
  {
    categoryName: "Shimmerin' Deep",
    categoryImage: "codex/cards/cards_shimmerin_deep",
    cards: [],
  },
  {
    categoryName: "Dungeons",
    categoryImage: "codex/cards/cards_dungeons",
    cards: [],
  },
  {
    categoryName: "Bosses & Nightmares",
    categoryImage: "codex/cards/cards_bosses_and_nightmares",
    cards: [],
  },
  {
    categoryName: "Events",
    categoryImage: "codex/cards/cards_events",
    cards: [],
  },
];
