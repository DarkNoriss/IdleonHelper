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
];
