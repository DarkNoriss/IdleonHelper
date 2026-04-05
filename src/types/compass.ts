export type CompassUpgrade = {
  name: string;
  change: number;
};

export type MinorNodeDef = {
  id: string;
  image: string;
  offset: { x: number; y: number };
};

export type CompassNodeDef = {
  id: string;
  label: string;
  image: string;
  minorNodes?: MinorNodeDef[];
};

export type CompassNodeGroup = {
  id: string;
  label: string;
  nodes: CompassNodeDef[];
};

export type MinorNodeWithParent = MinorNodeDef & { parent: string };
