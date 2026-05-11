import {
  BUBBLES_PER_CAULDRON,
  type BubbleRef,
  CAULDRON_FLAT_OFFSET,
  type Cauldron,
} from "@/types/alchemy";

type CauldronList = readonly string[];

// Ordered exactly as IdleonToolbox / the game store them. Position is the
// bubble's index in CauldronInfo[cauldron][index]. Slots 33 and 34 of each
// cauldron are "Bubble" placeholder entries (8 total in the game). They are
// kept in the array so positions remain aligned with CauldronInfo.
const POWER_BUBBLES: CauldronList = [
  "Roid Ragin",
  "Warriors Rule",
  "Hearty Diggy",
  "Wyoming Blood",
  "Reely Smart",
  "Big Meaty Claws",
  "Sploosh Sploosh",
  "Stronk Tools",
  "Fmj",
  "Bappity Boopity",
  "Brittley Spears",
  "Call Me Bob",
  "Carpenter",
  "Buff Boi Talent",
  "Orange Bargain",
  "Penny Of Strength",
  "Multorange",
  "Dream Of Ironfish",
  "Shimmeron",
  "Bite But Not Chew",
  "Spear Powah",
  "Slabi Orefish",
  "Gamer At Heart",
  "Slabi Strength",
  "Power Trione",
  "Farquad Force",
  "Endgame Eff I",
  "Tome Strength",
  "Essence Boost",
  "Crop Chapter",
  "Double Pagey",
  "Dmg Of The Sun",
  "Bone Bubble",
  "Bubble",
  "Bubble",
];

const QUICC_BUBBLES: CauldronList = [
  "Swift Steppin",
  "Archer Or Bust",
  "Hammer Hammer",
  "Lil Big Damage",
  "Anvilnomics",
  "Quick Slap",
  "Sanic Tools",
  "Bug]",
  "Shaquracy",
  "Cheap Shot",
  "Bow Jack",
  "Call Me Ash",
  "Cuz I Catch Em All",
  "Fast Boi Talent",
  "Green Bargain",
  "Dollar Of Agility",
  "Premigreen",
  "Fly In Mind",
  "Kill Per Kill",
  "Afk Expexp",
  "Bow Power",
  "Slabo Critterbug",
  "Sailor At Heart",
  "Slabo Agility",
  "Power Tritwo",
  "Quickdraw Quiver",
  "Essence Boost",
  "Endgame Eff Ii",
  "Tome Agility",
  "Stealth Chapter",
  "Spapunkie",
  "Dmg Of The Moon",
  "Dust Bubble",
  "Bubble",
  "Bubble",
];

const HIGH_IQ_BUBBLES: CauldronList = [
  "Stable Jenius",
  "Mage Is Best",
  "Hocus Choppus",
  "Molto Loggo",
  "Noodubble",
  "Name I Guess",
  "Le Brain Tools",
  "Cookin Roadkill",
  "Brewstachio",
  "All For Kill",
  "Matty Stafford",
  "Call Me Pope",
  "Gospel Leader",
  "Smart Boi Talent",
  "Purple Bargain",
  "Nickel Of Wisdom",
  "Severapurple",
  "Tree Sleeper",
  "Hyperswift",
  "Matrix Evolved",
  "Wand Pawur",
  "Slabe Logsoul",
  "Pious At Heart",
  "Slabe Wisdom",
  "Power Trithree",
  "Smarter Spells",
  "Endgame Eff Iii",
  "Essence Boost",
  "Tome Wisdom",
  "Essence Chapter",
  "Deep Depth",
  "Dmg Of The Soul",
  "Tachyon Bubble",
  "Bubble",
  "Bubble",
];

const KAZAM_BUBBLES: CauldronList = [
  "Lotto Skills",
  "Droppin Loads",
  "Startue Exp",
  "Level Up Gift",
  "Prowesessary",
  "Stamp Tramp",
  "Undeveloped Costs",
  "Da Daily Drip",
  "Grind Time",
  "Laaarrrryyyy",
  "Cogs For Hands",
  "Sample It",
  "Big Game Hunter",
  "Ignore Overdues",
  "Yellow Bargain",
  "Mr Massacre",
  "Egg Ink",
  "Diamond Chef",
  "Card Champ",
  "Petting The Rift",
  "Boaty Bubble",
  "Big P",
  "Bit By Bit",
  "Gifts Abound",
  "Atom Split",
  "Cropius Mapper",
  "Essence Boost",
  "Hinge Buster",
  "Ninja Looter",
  "Lo Cost Mo Jade",
  "Faster Nrg",
  "Kattle Da Goat",
  "Codfrey Rulz Ok",
  "Bubble",
  "Bubble",
];

const RAW_BY_CAULDRON: Record<Cauldron, CauldronList> = {
  power: POWER_BUBBLES,
  quicc: QUICC_BUBBLES,
  highIq: HIGH_IQ_BUBBLES,
  kazam: KAZAM_BUBBLES,
};

function buildFlatStore(): Record<number, BubbleRef> {
  const out: Record<number, BubbleRef> = {};
  for (const [cauldronKey, names] of Object.entries(RAW_BY_CAULDRON)) {
    const cauldron = cauldronKey as Cauldron;
    names.forEach((name, indexInCauldron) => {
      if (indexInCauldron >= BUBBLES_PER_CAULDRON) {
        return;
      }
      const flatIndex = CAULDRON_FLAT_OFFSET[cauldron] + indexInCauldron;
      out[flatIndex] = { name, cauldron, indexInCauldron, flatIndex };
    });
  }
  return out;
}

function buildNameIndex(
  flatStore: Record<number, BubbleRef>
): Record<string, BubbleRef[]> {
  const out: Record<string, BubbleRef[]> = {};
  for (const ref of Object.values(flatStore)) {
    const list = out[ref.name] ?? [];
    list.push(ref);
    out[ref.name] = list;
  }
  return out;
}

const FLAT_STORE: Readonly<Record<number, BubbleRef>> = buildFlatStore();
const NAME_INDEX: Readonly<Record<string, BubbleRef[]>> =
  buildNameIndex(FLAT_STORE);

export const TOTAL_BUBBLE_COUNT = Object.keys(FLAT_STORE).length;

export function getBubbleByFlatIndex(flatIndex: number): BubbleRef | null {
  return FLAT_STORE[flatIndex] ?? null;
}

export type NameResolution = {
  ref: BubbleRef | null;
  ambiguous: boolean;
};

// Resolve a curated PRISMATIC_ORDER entry by display name.
// Unique name -> { ref, ambiguous: false }
// Multiple cauldrons share the name (e.g. "Essence Boost") -> { ref: null, ambiguous: true }
//   The user must disambiguate; the page surfaces a warning.
// Unknown -> { ref: null, ambiguous: false }
export function resolveBubbleByName(name: string): NameResolution {
  const matches = NAME_INDEX[name] ?? [];
  if (matches.length === 0) {
    return { ref: null, ambiguous: false };
  }
  if (matches.length === 1) {
    return { ref: matches[0]!, ambiguous: false };
  }
  return { ref: null, ambiguous: true };
}
