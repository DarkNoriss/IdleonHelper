import type { Point } from "../../../backend/backend-types";

export type Card = {
  cardName: string;
  cardImage: string;
  expectedX?: number;
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
    categoryImage: "ui/codex/cards/cards_blunder_hills",
    cards: [
      { cardName: "poop-card", cardImage: "ui/codex/cards/game/poop_card" },
      {
        cardName: "crystal-carrot-card",
        cardImage: "ui/codex/cards/game/crystal_carrot_card",
      },
    ],
  },
  {
    categoryName: "Yum-Yum Desert",
    categoryImage: "ui/codex/cards/cards_yum_yum_desert",
    cards: [],
  },
  {
    categoryName: "Easy Resources",
    categoryImage: "ui/codex/cards/cards_easy_resources",
    cards: [],
  },
  {
    categoryName: "Medium Resources",
    categoryImage: "ui/codex/cards/cards_medium_resources",
    cards: [],
  },
  {
    categoryName: "Frostbite Tundra",
    categoryImage: "ui/codex/cards/cards_frostbite_tundra",
    cards: [],
  },
  {
    categoryName: "Hard Resources",
    categoryImage: "ui/codex/cards/cards_hard_resources",
    cards: [],
  },
  {
    categoryName: "Hyperion Nebula",
    categoryImage: "ui/codex/cards/cards_hyperion_nebula",
    cards: [
      {
        cardName: "clammie-card",
        cardImage: "ui/codex/cards/game/clammie_card",
      },
      {
        cardName: "demon-genie-card",
        cardImage: "ui/codex/cards/game/demon_genie_card",
      },
    ],
  },
  {
    categoryName: "Smolderin' Plateau",
    categoryImage: "ui/codex/cards/cards_smolderin_plateau",
    cards: [
      { cardName: "suggma-card", cardImage: "ui/codex/cards/game/suggma_card" },
      {
        cardName: "mister-brightside-card",
        cardImage: "ui/codex/cards/game/mister_brightside_card",
      },
    ],
  },
  {
    categoryName: "Spirited Valley",
    categoryImage: "ui/codex/cards/cards_spirited_valley",
    cards: [
      {
        cardName: "woodlin-spirit-card",
        cardImage: "ui/codex/cards/game/woodlin_spirit_card",
      },
      {
        cardName: "minichief-spirit-card",
        cardImage: "ui/codex/cards/game/minichief_spirit_card",
      },
    ],
  },
  {
    categoryName: "Shimmerfin Deep",
    categoryImage: "ui/codex/cards/cards_shimmerfin_deep",
    cards: [
      {
        cardName: "coralcave-guardian-card",
        cardImage: "ui/codex/cards/game/coralcave_guardian_card",
      },
    ],
  },
  {
    categoryName: "Dungeons",
    categoryImage: "ui/codex/cards/cards_dungeons",
    cards: [],
  },
  {
    categoryName: "Bosses & Nightmares",
    categoryImage: "ui/codex/cards/cards_bosses_and_nightmares",
    cards: [
      { cardName: "boop-card", cardImage: "ui/codex/cards/game/boop_card" },
      {
        cardName: "chaotic-amarok-card",
        cardImage: "ui/codex/cards/game/chaotic_amarok_card",
      },
      {
        cardName: "blighted-chizoar-card",
        cardImage: "ui/codex/cards/game/blighted_chizoar_card",
      },
      {
        cardName: "demented-spiritlord-card",
        cardImage: "ui/codex/cards/game/demented_spiritlord_card",
      },
      {
        cardName: "sovereign-emperor-card",
        cardImage: "ui/codex/cards/game/sovereign_emperor_card",
        expectedX: 511,
      },
      {
        cardName: "king-doot-card",
        cardImage: "ui/codex/cards/game/king_doot_card",
      },
      {
        cardName: "emperor-card",
        cardImage: "ui/codex/cards/game/emperor_card",
        expectedX: 449,
      },
      {
        cardName: "chaotic-emperor-card",
        cardImage: "ui/codex/cards/game/chaotic_emperor_card",
        expectedX: 480,
      },
    ],
  },
  {
    categoryName: "Events",
    categoryImage: "ui/codex/cards/cards_events",
    cards: [],
  },
];
