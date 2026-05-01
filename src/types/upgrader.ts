// Input shape for in-game upgrader scripts (tesseract, grimoire, ...).
// `index` is the row position in the in-game upgrade list (also matches the
// def index in the corresponding *_UPGRADE_DEFS array). `levels` is the
// number of upgrade clicks to fire on that row.
export type UpgraderStep = {
  index: number;
  levels: number;
};
