// Top-level shape of the persisted cloudsave envelope, the parsed game-state
// document, and the companion document. This is the single source of truth
// for raw save data across the renderer + parsers.
//
// Adding a new save key for a new feature?
//   1. Add the field to `IdleonRawData` (or `CompanionRawData` if it lives in
//      the companion doc).
//   2. Write JSDoc that says: what the data is, the indices/keys we read, and
//      a `Used by:` line listing the parsers/scripts that consume it.
//   3. The catch-all `[key: string]: unknown` index signature lets you access
//      any not-yet-typed key — but typed fields give autocomplete and catch
//      typos at compile time, so prefer adding the field properly.

/**
 * Top-level envelope persisted to zustand (`raw-json` store) and serialized to
 * `localStorage`. Mirrors the standard cloudsave export shape so future
 * features (guild, tournament, etc.) have a stable place to attach data
 * without re-shaping the store.
 *
 * - `data`      — `_data/{uid}` Firestore doc (the actual game state).
 * - `companion` — `_comp/{uid}` Firestore doc (companion list / pet state).
 *                 Lives in a separate Firestore collection because Idleon
 *                 writes companion data to a sibling document.
 * Other siblings stay null until per-feature subscriptions are added.
 */
export type RawJson = {
  data: IdleonRawData;
  charNames?: string[] | null;
  companion?: CompanionRawData | null;
  guildData?: unknown | null;
  tournament?: unknown | null;
  serverVars?: unknown | null;
  accountCreateTime?: number | null;
  lastUpdated?: number | null;
  extraData?: unknown | null;
};

/**
 * Sparse-array shape Firebase emits for some "array-like" save fields:
 * `{ "0": v, "1": v, ..., "length": N }`. Read with `Object.values` or by
 * numeric-string index, NOT with `Array.isArray` (returns false).
 */
export type SparseArray = Record<string, number> & { length: number };

/**
 * Game-state document at Firebase `_data/{uid}`. Top-level keys are flat —
 * Idleon writes its internal short keys (`Sushi`, `OptLacc`, `Atoms`, ...)
 * directly, no nesting under a `game` field.
 *
 * Many fields are JSON-encoded strings — call `parseArrayValue`
 * (`src/parsers/sushi-station.ts`) or equivalent before reading. Per-character
 * fields use `_N` suffix where N is the character index 0..9.
 *
 * Only fields actively consumed by our parsers are listed below. The catch-all
 * index signature lets exploratory code access any other key as `unknown`.
 * When you wire a new key into a parser, lift it from the catch-all to a
 * proper field with JSDoc.
 */
export type IdleonRawData = {
  // ── Sushi-station external bonus inputs ─────────────────────────────────
  // Each of these contributes a multiplier to the sushi-station currency-multi
  // (bucks/hr) calculation. Read via the helpers in
  // `src/parsers/sushi-station.ts:readArcade67` etc.

  /** Arcade upgrade levels. `ArcadeUpg[N]` = level of arcade upgrade N.
   *  `arcadeShop[67]` is the "Sushi_Bucks" effect (decay growth, x1=25, x2=100,
   *  doubled past level 100, doubled again with companion 27). */
  ArcadeUpg?: string | number[];
  /** Arcane / Tesseract (Elemental Sorcerer) upgrade levels — number array.
   *  Note: the save key is `Arcane`, NOT `Tess`. Used by `parseTesseract`. */
  Arcane?: number[];

  /** Atom upgrade levels. `Atoms[N]` = level of atom N.
   *  `atomsInfo[14]` is "Phosphorus - Sushi Bucks Generator" (baseBonus 1, so
   *  bonus % = level). */
  Atoms?: number[];

  /** In-app-purchase bundle ownership — plain object with `bon_*` keys
   *  (e.g. `{ bon_v: 1 }` = Bundle V owned). Used by sushi-station / grimoire
   *  / tesseract / compass to apply Bundle bonuses. */
  BundlesReceived?: string | Record<string, unknown>;

  // ── Construction / world-3 ──────────────────────────────────────────────
  /** Construction cog board — JSON-encoded grid placements. Used by
   *  `parseConstruction` for the construction solver. */
  CogM?: string;
  /** Construction cog ordering — small-cog column priority. Used by
   *  `parseConstruction`. */
  CogO?: string;

  // ── Class-specific upgrade trees ────────────────────────────────────────
  /** Compass (Voidwalker) state — JSON-encoded. Used by `parseCompass`
   *  (`src/parsers/compass.ts`) for the compass upgrade optimizer. */
  Compass?: string | unknown[];
  /** Flaggy pose configuration. Used by `parseConstruction`. */
  FlagP?: string;
  /** Flaggy slot unlock state. Used by `parseConstruction`. */
  FlagU?: string;

  /** Gaming (sprout / superbits) state — mixed-type array, JSON-encoded.
   *  `Gaming[12]` is the superbit-unlock string (concatenated letter markers,
   *  see `NUMBER_TO_LETTER`). Superbit 67 (`筒`) adds +100% to the
   *  sushi-station surcharge sum. */
  Gaming?: (number | string)[] | string;
  /** Gem-shop purchase counts (also encodes flaggy upgrades). Used by
   *  `parseConstruction`. */
  GemItemsPurchased?: string;
  /** Grimoire (Death Bringer) upgrade levels — number array, indexed by
   *  grimoire upgrade id. Used by `parseGrimoire`. */
  Grimoire?: number[];

  // ── Account-wide options & purchases ────────────────────────────────────
  /** Account options — flat array, indexed by integer slot. Each slot has its
   *  own meaning; we treat it as a generic bag and document the indices we
   *  read here.
   *
   * Indices currently read:
   * - `[311]` event-shop unlock string (concat of letter markers; see
   *   `NUMBER_TO_LETTER` in `src/parsers/sushi-station.ts`). Used by
   *   sushi-station for the event-shop sushi-bucks bonus.
   * - `[330..332]` grimoire bone counts.
   * - `[334..336]` grimoire kill counts.
   * - `[358..362]` compass dust counts; `[363]` total dusts collected.
   * - `[388..393]` tesseract tachyons.
   * - `[594]` button total presses (used by sushi-station for button bonus 2).
   * - daily-discount-uses + first-3MC-redux indices for grimoire / tesseract /
   *   compass cost calc.
   *
   * Used by: every domain parser (sushi / grimoire / tesseract / compass /
   * boss-farmer). */
  OptLacc?: number[];

  /** Research (world-7) state — JSON-encoded array.
   *
   * Index map:
   * - `[0]` grid square levels (240 entries).
   * - `[1]` cell → observation index map.
   * - `[7]` minehead game state — `[4]` = opponents beaten.
   * - `[8]` minehead upgrade levels.
   *
   * For sushi: grid square 189 ("Sushi Station Linguistics", baseBonus 25,
   * maxLv 4) and minehead opponent 11 (worth 25 bucks-cap %, capped at +25%)
   * both contribute to currency-multi. */
  Research?: string;

  /** Sailing state — JSON-encoded array.
   *  `Sailing[3][N]` = acquired tier of artifact N (0 = not acquired, 1=basic,
   *  2=ancient, 3=eldritch, 4=sovereign, 5=omnipotent, 6=transcendent).
   *  Artifact 39 is the sushi-bucks artifact; tier scales the multiplier
   *  linearly (tier 1 → 2x, tier 6 → 7x). */
  Sailing?: string | unknown[];

  /** Equinox / Weekly Boss state — flat object. Cloud-completion flags live
   *  under `d_<index>` keys (e.g. `d_71`, `d_72`, `d_76`). A cloud is fully
   *  completed when its value is exactly `-1`.
   *
   *  Used by: sushi-station — grid-bonus all-multi factor reads clouds 71/72/76
   *  to compound research-grid bonuses (e.g. grid 189 sushi-bucks). */
  WeeklyBoss?: string | Record<string, unknown>;

  /** Spelunking save data — JSON-encoded. Read by grimoire / tesseract /
   *  compass for cost-discount inputs (3MC redux flag, etc.). */
  Spelunk?: string;
  // ── Sushi station / world-7 ─────────────────────────────────────────────
  /** Sushi-station state — JSON-encoded array.
   *
   * Index map (after `tryToParse`):
   * - `[0]` slot tiers per board slot (length up to 120).
   * - `[1]` hot-plate flags per slot (1 = hot plate active).
   * - `[2]` upgrade levels — index by `SUSHI_UPG` order
   *   (`src/parsers/sushi-station-formulas.ts`).
   * - `[3]` fireplace types per column (length 15; 0=red, 1=blue, etc.).
   * - `[4]` misc state — `[0]`=fuel, `[1]`=overtuned SPA, `[2]`=sparks,
   *   `[3]`=bucks, `[5..7]`=shaker uses.
   * - `[5]` unique-sushi-discovered tracking (highest tier seen per sushi).
   * - `[6]` knowledge XP per sushi.
   * - `[7]` knowledge levels per sushi.
   *
   * Used by: sushi-station optimizer + sushi.merge / HOTEW scripts. */
  Sushi?: string;

  // ── Per-character ───────────────────────────────────────────────────────
  /** Per-character Lv0 array — character N has key `Lv0_N` (N = 0..9).
   *  Index `[20]` holds the character's research level. We read across all 10
   *  slots and take the max as the account-wide research level for sushi
   *  optimizer gating + HOTEW lock. */
  [lv0Key: `Lv0_${number}`]: number[] | undefined;

  // Forward-compat catch-all: any not-yet-typed game key returns `unknown`.
  // Lift fields out of this into proper named entries when wiring a new parser.
  [key: string]: unknown;
};

/**
 * Companion-collection document at Firebase `_comp/{uid}`. Stored in the
 * envelope's `companion` field — separate from `_data/{uid}` because Idleon
 * writes companions to a different Firestore collection.
 *
 * One-letter keys are the game's; we don't rename them.
 *
 * - `l[]` Acquired-companion list. Each entry is `"index,tradable"`
 *         (e.g. `"27,1"` = companion index 27, tradable). A companion is
 *         "active" / "acquired" iff its index appears at least once in this
 *         list. `count = l.filter(e => Number(e.split(',')[0]) === idx).length`.
 * - `e`   Currently-equipped companion, format `"index,tradable"`.
 * - `s`   Pet crystals (currency).
 * - `t`   Last free-claim timestamp.
 * - `x`   Total boxes opened.
 * - `p`   Max storage.
 *
 * Used by: sushi-station — companion 27 doubles the arcade67 sushi-bucks bonus,
 * companion 147 contributes to the button-bonus-2 multiplier.
 */
export type CompanionRawData = {
  d?: number;
  e?: string;
  l?: string[];
  o?: number[];
  p?: number;
  s?: number;
  t?: number;
  x?: number;
  y?: number;
  [key: string]: unknown;
};
