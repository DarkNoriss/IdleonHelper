export type CompassUpgrade = {
  name: string;
  change: number;
};

export type CompassNodeDef = {
  id: string;
  label: string;
  image: string;
};

export const COMPASS_NODE_DEFS: CompassNodeDef[] = [
  {
    id: "pathfinder",
    label: "Pathfinder",
    image: "compass/compass_pathfinder",
  },
  {
    id: "fighter-path",
    label: "Fighter Path",
    image: "compass/fighter-path/compass_fighter_path",
  },
  {
    id: "tempest-damage",
    label: "Tempest Damage",
    image: "compass/fighter-path/compass_tempest_damage",
  },
  {
    id: "tempest-accuracy",
    label: "Tempest Accuracy",
    image: "compass/fighter-path/compass_tempest_accuracy",
  },
  {
    id: "tempest-bullseye",
    label: "Tempest Bullseye",
    image: "compass/fighter-path/compass_tempest_bullseye",
  },
  {
    id: "tempest-crits",
    label: "Tempest Crits",
    image: "compass/fighter-path/compass_tempest_crits",
  },
  {
    id: "tempest-maxhit",
    label: "Tempest Maxhit",
    image: "compass/fighter-path/compass_tempest_maxhit",
  },
  {
    id: "tempest-mega-damage",
    label: "Tempest Mega Damage",
    image: "compass/fighter-path/compass_tempest_mega_damage",
  },
  {
    id: "tempest-rapidshot",
    label: "Tempest Rapidshot",
    image: "compass/fighter-path/compass_tempest_rapidshot",
  },
  {
    id: "multishot",
    label: "Multishot",
    image: "compass/fighter-path/compass_multishot",
  },
  {
    id: "stardust-hoarding",
    label: "Stardust Hoarding",
    image: "compass/fighter-path/compass_stardust_hoarding",
  },
  {
    id: "abomination-slayer-i",
    label: "Abomination Slayer I",
    image: "compass/abominations/compass_abomination_slayer_i",
  },
  {
    id: "abomination-slayer-ii",
    label: "Abomination Slayer II",
    image: "compass/abominations/compass_abomination_slayer_ii",
  },
  {
    id: "abomination-slayer-iii",
    label: "Abomination Slayer III",
    image: "compass/abominations/compass_abomination_slayer_iii",
  },
  {
    id: "abomination-slayer-iv",
    label: "Abomination Slayer IV",
    image: "compass/abominations/compass_abomination_slayer_iv",
  },
  {
    id: "abomination-slayer-v",
    label: "Abomination Slayer V",
    image: "compass/abominations/compass_abomination_slayer_v",
  },
  {
    id: "abomination-slayer-vi",
    label: "Abomination Slayer VI",
    image: "compass/abominations/compass_abomination_slayer_vi",
  },
  {
    id: "abomination-slayer-vii",
    label: "Abomination Slayer VII",
    image: "compass/abominations/compass_abomination_slayer_vii",
  },
  {
    id: "abomination-slayer-viii",
    label: "Abomination Slayer VIII",
    image: "compass/abominations/compass_abomination_slayer_viii",
  },
  {
    id: "abomination-slayer-ix",
    label: "Abomination Slayer IX",
    image: "compass/abominations/compass_abomination_slayer_ix",
  },
  {
    id: "abomination-slayer-x",
    label: "Abomination Slayer X",
    image: "compass/abominations/compass_abomination_slayer_x",
  },
  {
    id: "abomination-slayer-xi",
    label: "Abomination Slayer XI",
    image: "compass/abominations/compass_abomination_slayer_xi",
  },
  {
    id: "abomination-slayer-xii",
    label: "Abomination Slayer XII",
    image: "compass/abominations/compass_abomination_slayer_xii",
  },
  {
    id: "abomination-slayer-xiii",
    label: "Abomination Slayer XIII",
    image: "compass/abominations/compass_abomination_slayer_xiii",
  },
  {
    id: "abomination-slayer-xiv",
    label: "Abomination Slayer XIV",
    image: "compass/abominations/compass_abomination_slayer_xiv",
  },
  {
    id: "abomination-slayer-xv",
    label: "Abomination Slayer XV",
    image: "compass/abominations/compass_abomination_slayer_xv",
  },
  {
    id: "abomination-slayer-xvi",
    label: "Abomination Slayer XVI",
    image: "compass/abominations/compass_abomination_slayer_xvi",
  },
  {
    id: "abomination-slayer-xvii",
    label: "Abomination Slayer XVII",
    image: "compass/abominations/compass_abomination_slayer_xvii",
  },
  {
    id: "abomination-slayer-xviii",
    label: "Abomination Slayer XVIII",
    image: "compass/abominations/compass_abomination_slayer_xviii",
  },
  {
    id: "abomination-slayer-xix",
    label: "Abomination Slayer XIX",
    image: "compass/abominations/compass_abomination_slayer_xix",
  },
  {
    id: "abomination-slayer-xx",
    label: "Abomination Slayer XX",
    image: "compass/abominations/compass_abomination_slayer_xx",
  },
  {
    id: "abomination-slayer-xxi",
    label: "Abomination Slayer XXI",
    image: "compass/abominations/compass_abomination_slayer_xxi",
  },
  {
    id: "abomination-slayer-xxii",
    label: "Abomination Slayer XXII",
    image: "compass/abominations/compass_abomination_slayer_xxii",
  },
  {
    id: "abomination-slayer-xxiii",
    label: "Abomination Slayer XXIII",
    image: "compass/abominations/compass_abomination_slayer_xxiii",
  },
  {
    id: "abomination-slayer-xxiv",
    label: "Abomination Slayer XXIV",
    image: "compass/abominations/compass_abomination_slayer_xxiv",
  },
  {
    id: "abomination-slayer-xxv",
    label: "Abomination Slayer XXV",
    image: "compass/abominations/compass_abomination_slayer_xxv",
  },
  {
    id: "abomination-slayer-xxvi",
    label: "Abomination Slayer XXVI",
    image: "compass/abominations/compass_abomination_slayer_xxvi",
  },
  {
    id: "elemental-path",
    label: "Elemental Path",
    image: "compass/elemental-path/compass_elemental_path",
  },
  {
    id: "elemental-destruction",
    label: "Elemental Destruction",
    image: "compass/elemental-path/compass_elemental_destruction",
  },
  {
    id: "elemental-vision",
    label: "Elemental Vision",
    image: "compass/elemental-path/compass_elemental_vision",
  },
  {
    id: "medallion-collection",
    label: "Medallion Collection",
    image: "compass/elemental-path/compass_medallion_collection",
  },
  {
    id: "medallion-magnate",
    label: "Medallion Magnate",
    image: "compass/elemental-path/compass_medallion_magnate",
  },
  {
    id: "ring-drop",
    label: "Ring Drop",
    image: "compass/elemental-path/compass_ring_drop",
  },
  {
    id: "stone-drop",
    label: "Stone Drop",
    image: "compass/elemental-path/compass_stone_drop",
  },
  {
    id: "stone-failsafe",
    label: "Stone Failsafe",
    image: "compass/elemental-path/compass_stone_failsafe",
  },
  {
    id: "the-luck-factor",
    label: "The Luck Factor",
    image: "compass/elemental-path/compass_the_luck_factor",
  },
  {
    id: "top-of-the-mornin",
    label: "Top Of The Mornin",
    image: "compass/elemental-path/compass_top_of_the_mornin",
  },
  {
    id: "weapon-drop",
    label: "Weapon Drop",
    image: "compass/elemental-path/compass_weapon_drop",
  },
  {
    id: "weapon-improvment",
    label: "Weapon Improvment",
    image: "compass/elemental-path/compass_weapon_improvment",
  },
  {
    id: "grumblos-guarantee",
    label: "Grumblos Guarantee",
    image: "compass/compass_grumblos_guarantee",
  },
  {
    id: "stop-drop-and-roll",
    label: "Stop Drop And Roll",
    image: "compass/compass_stop_drop_and_roll",
  },
  {
    id: "worldfinder",
    label: "Worldfinder",
    image: "compass/compass_worldfinder",
  },
];
