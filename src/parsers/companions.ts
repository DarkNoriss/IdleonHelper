import type { CompanionRawData } from "@/types/raw-json";

/**
 * Companion catalog -- maps the companion's index in the game's master list
 * to its name, constant `bonus` value (the same number toolbox stores in
 * `companions[idx].bonus`), and a short description of its in-game effect.
 *
 * The acquired-state lives in `_comp/{uid}` (Realtime Database, NOT Firestore;
 * see `cloudsave-subscription.ts`). Each entry in `companion.l` is a
 * `"index,..."` string -- a companion is "active" iff its index appears at
 * least once.
 *
 * `bonus` semantics follow toolbox:
 *  - When a parser uses `companions[idx].bonus`, treat it as the additive
 *    contribution when acquired (e.g. companion 55 -> +15% to all grid bonuses,
 *    companion 147 -> +50% to button per-press multi).
 *  - A few entries (e.g. companion 27) are referenced by toolbox as a hardcoded
 *    multiplier (`isAcquired ? 2 : 1`) and ignore the `bonus` field; we mirror
 *    that in the consuming parser. The `bonus` here is informational.
 *
 * Add a new entry whenever a feature reads a companion. Future agents should
 * be able to grep for the index and find what it does without opening toolbox.
 */
export const COMPANIONS = {
  0: {
    name: "King Doot",
    bonus: 1,
    effect:
      "Acts as a flag (multiplied with grid 173 level) for the +5 bonus to research-grid all-multi.",
  },
  27: {
    name: "Spirit Reindeer",
    bonus: 1,
    effect:
      "2.00x Gold Ball Shop (Arcade) bonuses. Toolbox hardcodes the 2x; the bonus field is informational only.",
  },
  55: {
    name: "Pirate Deckhand",
    bonus: 15,
    effect: "+15% to all Research Grid bonuses (compounds via gridAllMulti).",
  },
  147: {
    name: "Mantaray",
    bonus: 50,
    effect: "+50% to all W7 Button per-press bonuses (`bonusMulti` factor).",
  },
} as const satisfies Record<
  number,
  { name: string; bonus: number; effect: string }
>;

/**
 * Returns true if the companion at the given index has been acquired
 * (appears at least once in `companion.l`). Each entry is a comma-separated
 * string starting with the companion index, e.g. `"27,0,0,387,0"`.
 */
export function isCompanionAcquired(
  companion: CompanionRawData | null,
  idx: number
): boolean {
  const list = companion?.l;
  if (!Array.isArray(list)) {
    return false;
  }
  return list.some(
    (entry) => Number(String(entry ?? "").split(",")[0]) === idx
  );
}
