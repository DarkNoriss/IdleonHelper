import { COMPASS_NODE_DEFS } from "../../../../types/compass";

export type CompassNode = {
  image: string;
  neighbors: string[];
};

export type CompassMinorNode = {
  image: string;
  parent: string;
  offset: { x: number; y: number };
};

export const COMPASS_NODES: Record<string, CompassNode> = Object.fromEntries(
  COMPASS_NODE_DEFS.map((def) => [def.id, { image: def.image, neighbors: [] }])
);

export const COMPASS_MINOR_NODES: Record<string, CompassMinorNode> = {};
