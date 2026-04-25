export type RawJson = {
  data: {
    GemItemsPurchased?: string;
    CogM?: string;
    CogO?: string;
    [key: string]: unknown;
  };
  // Mirrors IdleonToolbox's top-level envelope so future features (guild,
  // companions, tournament, char-name lookups) can live in the same store
  // without re-shaping. v1 only populates `data` from Firestore — siblings
  // stay null until per-feature parsers are added.
  charNames?: string[] | null;
  companion?: unknown | null;
  guildData?: unknown | null;
  tournament?: unknown | null;
  serverVars?: unknown | null;
  accountCreateTime?: number | null;
  lastUpdated?: number | null;
  extraData?: unknown | null;
};
