// Input shape for in-game upgrader scripts (tesseract, grimoire, ...).
// `index` is the row position in the in-game upgrade list (also matches the
// def index in the corresponding *_UPGRADE_DEFS array). `levels` is the
// number of upgrade clicks to fire on that row. `fromLevel` is the level the
// row starts at when the script reaches this step (cumulative across earlier
// steps targeting the same index) - optional, used only for clearer logs.
export type UpgraderStep = {
  index: number;
  levels: number;
  fromLevel?: number;
};
