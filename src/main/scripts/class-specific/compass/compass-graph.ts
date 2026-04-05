import { COMPASS_NODE_DEFS } from "@/shared/compass-config";

export type CompassNode = {
  image: string;
  neighbors: string[];
};

export const COMPASS_NODES: Record<string, CompassNode> = Object.fromEntries(
  COMPASS_NODE_DEFS.map((def) => [def.id, { image: def.image, neighbors: [] }])
);
