import type {
  CompassNodeDef,
  CompassNodeGroup,
  MinorNodeWithParent,
} from "@/types/compass";

export const COMPASS_NODE_GROUPS: CompassNodeGroup[] = [
  {
    id: "root",
    label: "Root",
    nodes: [
      {
        id: "pathfinder",
        label: "Pathfinder",
        image: "compass/compass_pathfinder",
      },
      {
        id: "worldfinder",
        label: "Worldfinder",
        image: "compass/compass_worldfinder",
      },
      {
        id: "stop-drop-and-roll",
        label: "Stop Drop And Roll",
        image: "compass/compass_stop_drop_and_roll",
      },
      {
        id: "grumblos-guarantee",
        label: "Grumblos Guarantee",
        image: "compass/compass_grumblos_guarantee",
      },
    ],
  },
  {
    id: "fighter",
    label: "Fighter Path",
    nodes: [
      {
        id: "fighter-path",
        label: "Fighter Path",
        image: "compass/fighter-path/compass_fighter_path",
      },
      {
        id: "tempest-damage",
        label: "Tempest Damage",
        image: "compass/fighter-path/compass_tempest_damage",
        minorNodes: [
          {
            id: "tempest-damage-i",
            image: "compass/fighter-path/compass_tempest_damage_minor",
            offset: { x: 467, y: 215 },
          },
        ],
      },
      {
        id: "tempest-accuracy",
        label: "Tempest Accuracy",
        image: "compass/fighter-path/compass_tempest_accuracy",
        minorNodes: [
          {
            id: "tempest-accuracy-i",
            image: "compass/fighter-path/compass_tempest_accuracy_minor",
            offset: { x: 551, y: 338 },
          },
          {
            id: "tempest-damage-ii",
            image: "compass/fighter-path/compass_tempest_damage_minor",
            offset: { x: 516, y: 188 },
          },
          {
            id: "tempest-damage-iii",
            image: "compass/fighter-path/compass_tempest_damage_minor",
            offset: { x: 616, y: 243 },
          },
        ],
      },
      {
        id: "multishot",
        label: "Multishot",
        image: "compass/fighter-path/compass_multishot",
        minorNodes: [
          {
            id: "tempest-accuracy-ii",
            image: "compass/fighter-path/compass_tempest_accuracy_minor",
            offset: { x: 613, y: 239 },
          },
        ],
      },
      {
        id: "tempest-crits",
        label: "Tempest Crits",
        image: "compass/fighter-path/compass_tempest_crits",
      },
      {
        id: "tempest-mega-damage",
        label: "Tempest Mega Damage",
        image: "compass/fighter-path/compass_tempest_mega_damage",
        minorNodes: [
          {
            id: "tempest-damage-iv",
            image: "compass/fighter-path/compass_tempest_damage_minor",
            offset: { x: 572, y: 181 },
          },
        ],
      },
      {
        id: "tempest-rapidshot",
        label: "Tempest Rapidshot",
        image: "compass/fighter-path/compass_tempest_rapidshot",
        minorNodes: [
          {
            id: "tempest-accuracy-v",
            image: "compass/fighter-path/compass_tempest_accuracy_minor",
            offset: { x: 577, y: 188 },
          },
        ],
      },
      {
        id: "tempest-bullseye",
        label: "Tempest Bullseye",
        image: "compass/fighter-path/compass_tempest_bullseye",
        minorNodes: [
          {
            id: "tempest-damage-vi",
            image: "compass/fighter-path/compass_tempest_damage_minor",
            offset: { x: 544, y: 205 },
          },
          {
            id: "tempest-accuracy-iv",
            image: "compass/fighter-path/compass_tempest_accuracy_minor",
            offset: { x: 626, y: 173 },
          },
        ],
      },
      {
        id: "tempest-maxhit",
        label: "Tempest Maxhit",
        image: "compass/fighter-path/compass_tempest_maxhit",
        minorNodes: [
          {
            id: "tempest-damage-v",
            image: "compass/fighter-path/compass_tempest_damage_minor",
            offset: { x: 506, y: 206 },
          },
        ],
      },
      {
        id: "stardust-hoarding",
        label: "Stardust Hoarding",
        image: "compass/fighter-path/compass_stardust_hoarding",
        minorNodes: [
          {
            id: "tempest-accuracy-iii",
            image: "compass/fighter-path/compass_tempest_accuracy_minor",
            offset: { x: 478, y: 204 },
          },
        ],
      },
    ],
  },
  {
    id: "elemental",
    label: "Elemental Path",
    nodes: [
      {
        id: "elemental-path",
        label: "Elemental Path",
        image: "compass/elemental-path/compass_elemental_path",
      },
      {
        id: "weapon-drop",
        label: "Weapon Drop",
        image: "compass/elemental-path/compass_weapon_drop",
        minorNodes: [
          {
            id: "weapon-drops",
            image: "compass/elemental-path/compass_elemental_minor",
            offset: { x: 433, y: 283 },
          },
        ],
      },
      {
        id: "elemental-vision",
        label: "Elemental Vision",
        image: "compass/elemental-path/compass_elemental_vision",
        minorNodes: [
          {
            id: "ring-drops-ii",
            image: "compass/elemental-path/compass_elemental_minor",
            offset: { x: 580, y: 197 },
          },
        ],
      },
      {
        id: "stone-drop",
        label: "Stone Drop",
        image: "compass/elemental-path/compass_stone_drop",
      },
      {
        id: "medallion-collection",
        label: "Medallion Collection",
        image: "compass/elemental-path/compass_medallion_collection",
      },
      {
        id: "elemental-destruction",
        label: "Elemental Destruction",
        image: "compass/elemental-path/compass_elemental_destruction",
      },
      {
        id: "ring-drop",
        label: "Ring Drop",
        image: "compass/elemental-path/compass_ring_drop",
        minorNodes: [
          {
            id: "lucky-drops-iii",
            image: "compass/elemental-path/compass_elemental_minor",
            offset: { x: 610, y: 314 },
          },
        ],
      },
      {
        id: "medallion-magnate",
        label: "Medallion Magnate",
        image: "compass/elemental-path/compass_medallion_magnate",
        minorNodes: [
          {
            id: "medallion-drops",
            image: "compass/elemental-path/compass_elemental_minor",
            offset: { x: 445, y: 271 },
          },
        ],
      },
      {
        id: "the-luck-factor",
        label: "The Luck Factor",
        image: "compass/elemental-path/compass_the_luck_factor",
        minorNodes: [
          {
            id: "stone-drops-i",
            image: "compass/elemental-path/compass_elemental_minor",
            offset: { x: 493, y: 176 },
          },
        ],
      },
      {
        id: "weapon-improvement",
        label: "Weapon Improvement",
        image: "compass/elemental-path/compass_weapon_improvement",
        minorNodes: [
          {
            id: "stone-drops-ii",
            image: "compass/elemental-path/compass_elemental_minor",
            offset: { x: 454, y: 230 },
          },
        ],
      },
      {
        id: "top-of-the-mornin",
        label: "Top Of The Mornin",
        image: "compass/elemental-path/compass_top_of_the_mornin",
      },
      {
        id: "stone-failsafe",
        label: "Stone Failsafe",
        image: "compass/elemental-path/compass_stone_failsafe",
      },
    ],
  },
  {
    id: "nomadic",
    label: "Nomadic Path",
    nodes: [
      {
        id: "nomadic-path",
        label: "Nomadic Path",
        image: "compass/nomadic-path/compass_nomadic_path",
      },
      {
        id: "critter-culture",
        label: "Critter Culture",
        image: "compass/nomadic-path/compass_critter_culture",
      },
      {
        id: "jade-coinage",
        label: "Jade Coinage",
        image: "compass/nomadic-path/compass_jade_coinage",
      },
      {
        id: "moon-of-print",
        label: "Moon Of Print",
        image: "compass/nomadic-path/compass_moon_of_print",
        minorNodes: [
          {
            id: "printer-sale-i",
            image: "compass/nomadic-path/compass_printer_sale_minor",
            offset: { x: 515, y: 346 },
          },
          {
            id: "printer-sale-ii",
            image: "compass/nomadic-path/compass_printer_sale_minor",
            offset: { x: 623, y: 272 },
          },
        ],
      },
      {
        id: "exalted-stamps",
        label: "Exalted Stamps",
        image: "compass/nomadic-path/compass_exalted_stamps",
      },
      {
        id: "moon-of-sneak",
        label: "Moon Of Sneak",
        image: "compass/nomadic-path/compass_moon_of_sneak",
        minorNodes: [
          {
            id: "sneaky-sale-i",
            image: "compass/nomadic-path/compass_sneaky_sale_minor",
            offset: { x: 499, y: 203 },
          },
          {
            id: "sneaky-sale-ii",
            image: "compass/nomadic-path/compass_sneaky_sale_minor",
            offset: { x: 633, y: 292 },
          },
          {
            id: "sneaky-sale-iii",
            image: "compass/nomadic-path/compass_sneaky_sale_minor",
            offset: { x: 552, y: 338 },
          },
        ],
      },
      {
        id: "magnesium-atom",
        label: "Magnesium Atom",
        image: "compass/nomadic-path/compass_magnesium_atom",
      },
      {
        id: "all-knowing-eye",
        label: "All Knowing Eye",
        image: "compass/nomadic-path/compass_all_knowing_eye",
      },
      {
        id: "moon-of-damage",
        label: "Moon Of Damage",
        image: "compass/nomadic-path/compass_moon_of_damage",
        minorNodes: [
          {
            id: "damage-sale-i",
            image: "compass/nomadic-path/compass_damage_sale_minor",
            offset: { x: 483, y: 192 },
          },
          {
            id: "damage-sale-ii",
            image: "compass/nomadic-path/compass_damage_sale_minor",
            offset: { x: 464, y: 333 },
          },
          {
            id: "damage-sale-iii",
            image: "compass/nomadic-path/compass_damage_sale_minor",
            offset: { x: 567, y: 336 },
          },
        ],
      },
      {
        id: "talented-masters",
        label: "Talented Masters",
        image: "compass/nomadic-path/compass_talented_masters",
      },
      {
        id: "opa-opa-opa",
        label: "Opa Opa Opa",
        image: "compass/nomadic-path/compass_opa_opa_opa",
      },
      {
        id: "atomic-cost-crash",
        label: "Atomic Cost Crash",
        image: "compass/nomadic-path/compass_atomic_cost_crash",
      },
      {
        id: "atomic-potential",
        label: "Atomic Potential",
        image: "compass/nomadic-path/compass_atomic_potential",
      },
      {
        id: "my-talent-is-best-talent",
        label: "My Talent Is Best Talent",
        image: "compass/nomadic-path/compass_my_talent_is_best_talent",
      },
      {
        id: "moon-of-experience",
        label: "Moon Of Experience",
        image: "compass/nomadic-path/compass_moon_of_experience",
        minorNodes: [
          {
            id: "experience-sale-iii",
            image: "compass/nomadic-path/compass_experience_sale_minor",
            offset: { x: 547, y: 186 },
          },
        ],
      },
    ],
  },
  {
    id: "survival",
    label: "Survival Path",
    nodes: [
      {
        id: "survival-path",
        label: "Survival Path",
        image: "compass/survival-path/compass_survival_path",
      },
      {
        id: "tempest-heartbeat",
        label: "Tempest Heartbeat",
        image: "compass/survival-path/compass_tempest_heartbeat",
      },
      {
        id: "tempest-defence",
        label: "Tempest Defence",
        image: "compass/survival-path/compass_tempest_defence",
        minorNodes: [
          {
            id: "tempest-defence-i",
            image: "compass/survival-path/compass_tempest_defence_minor",
            offset: { x: 467, y: 243 },
          },
          {
            id: "de-dust-i",
            image: "compass/survival-path/compass_de_dust_minor",
            offset: { x: 425, y: 305 },
          },
          {
            id: "de-dust-ii",
            image: "compass/survival-path/compass_de_dust_minor",
            offset: { x: 491, y: 352 },
          },
        ],
      },
      {
        id: "5-minute-mile",
        label: "5 Minute Mile",
        image: "compass/survival-path/compass_5_minute_mile",
      },
      {
        id: "moondust-hoarding",
        label: "Moondust Hoarding",
        image: "compass/survival-path/compass_moondust_hoarding",
        minorNodes: [
          {
            id: "tempest-health-i",
            image: "compass/survival-path/compass_tempest_health_minor",
            offset: { x: 428, y: 296 },
          },
          {
            id: "tempest-defence-iii",
            image: "compass/survival-path/compass_tempest_defence_minor",
            offset: { x: 538, y: 193 },
          },
        ],
      },
      {
        id: "solardust-hoarding",
        label: "Solardust Hoarding",
        image: "compass/survival-path/compass_solardust_hoarding",
        minorNodes: [
          {
            id: "tempest-defence-ii",
            image: "compass/survival-path/compass_tempest_defence_minor",
            offset: { x: 489, y: 187 },
          },
        ],
      },
      {
        id: "tempest-reach",
        label: "Tempest Reach",
        image: "compass/survival-path/compass_tempest_reach",
        minorNodes: [
          {
            id: "de-dust-iii",
            image: "compass/survival-path/compass_de_dust_minor",
            offset: { x: 567, y: 396 },
          },
        ],
      },
      {
        id: "mountains-of-dust",
        label: "Mountains Of Dust",
        image: "compass/survival-path/compass_mountains_of_dust",
      },
      {
        id: "cant-touch-this",
        label: "Cant Touch This",
        image: "compass/survival-path/compass_cant_touch_this",
      },
      {
        id: "spire-of-dust",
        label: "Spire Of Dust",
        image: "compass/survival-path/compass_spire_of_dust",
        minorNodes: [
          {
            id: "tempest-health-ii",
            image: "compass/survival-path/compass_tempest_health_minor",
            offset: { x: 472, y: 190 },
          },
          {
            id: "de-dust-v",
            image: "compass/survival-path/compass_de_dust_minor",
            offset: { x: 590, y: 342 },
          },
        ],
      },
      {
        id: "novadust-discovery",
        label: "Novadust Discovery",
        image: "compass/survival-path/compass_novadust_discovery",
      },
      {
        id: "knockoff-compass",
        label: "Knockoff Compass",
        image: "compass/survival-path/compass_knockoff_compass",
        minorNodes: [
          {
            id: "de-dust-iv",
            image: "compass/survival-path/compass_de_dust_minor",
            offset: { x: 564, y: 344 },
          },
          {
            id: "tempest-defence-iv",
            image: "compass/survival-path/compass_tempest_defence_minor",
            offset: { x: 502, y: 196 },
          },
        ],
      },
    ],
  },
  {
    id: "abominations",
    label: "Abominations",
    nodes: [
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
        id: "abomination-slayer-xxvii",
        label: "Abomination Slayer XXVII",
        image: "compass/abominations/compass_abomination_slayer_xxvii",
      },
      {
        id: "abomination-slayer-xxviii",
        label: "Abomination Slayer XXVIII",
        image: "compass/abominations/compass_abomination_slayer_xxviii",
      },
    ],
  },
];

export const COMPASS_NODE_DEFS: CompassNodeDef[] = COMPASS_NODE_GROUPS.flatMap(
  (g) => g.nodes
);

export const COMPASS_MINOR_NODE_DEFS: MinorNodeWithParent[] =
  COMPASS_NODE_GROUPS.flatMap((g) =>
    g.nodes.flatMap((n) =>
      (n.minorNodes ?? []).map((m) => ({ ...m, parent: n.id }))
    )
  );
