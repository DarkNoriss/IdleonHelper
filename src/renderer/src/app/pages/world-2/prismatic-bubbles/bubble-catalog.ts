import {
  BUBBLES_PER_CAULDRON,
  type BubbleRef,
  CAULDRON_FLAT_OFFSET,
  type Cauldron,
} from "@/types/alchemy";

type CauldronList = readonly string[];

// Ordered exactly as IdleonToolbox / the game store them: index 0 = first
// bubble in cauldron, index 24 = last. Position is the bubble's index in the
// game save (CauldronInfo[cauldron][index]).
//
// Display names derived from IdleonToolbox website-data.json bubbleName field
// via the toolbox formula: cleanUnderscore(bubbleName.toLowerCase().capitalizeAll())
// Source: C:\Users\darkn\Downloads\IdleonToolbox-main\data\website-data.json
//
// Each cauldron has 35 bubbles in the source; only the first 25 are included
// here (indices 0-24). The 10 extra per cauldron were added in a later game
// update — update BUBBLES_PER_CAULDRON in src/types/alchemy.ts if needed.
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
];

const RAW_BY_CAULDRON: Record<Cauldron, CauldronList> = {
  power: POWER_BUBBLES,
  quicc: QUICC_BUBBLES,
  highIq: HIGH_IQ_BUBBLES,
  kazam: KAZAM_BUBBLES,
};

function buildCatalog(): Record<string, BubbleRef> {
  const out: Record<string, BubbleRef> = {};
  for (const [cauldronKey, names] of Object.entries(RAW_BY_CAULDRON)) {
    const cauldron = cauldronKey as Cauldron;
    names.forEach((name, indexInCauldron) => {
      if (indexInCauldron >= BUBBLES_PER_CAULDRON) {
        return;
      }
      if (out[name]) {
        console.warn(`Duplicate bubble name in catalog: ${name}`);
      }
      const flatIndex = CAULDRON_FLAT_OFFSET[cauldron] + indexInCauldron;
      out[name] = { name, cauldron, indexInCauldron, flatIndex };
    });
  }
  return out;
}

export const BUBBLE_CATALOG: Readonly<Record<string, BubbleRef>> =
  buildCatalog();

export const TOTAL_BUBBLE_COUNT = Object.keys(BUBBLE_CATALOG).length;

export function getBubbleByFlatIndex(flatIndex: number): BubbleRef | null {
  for (const ref of Object.values(BUBBLE_CATALOG)) {
    if (ref.flatIndex === flatIndex) {
      return ref;
    }
  }
  return null;
}
