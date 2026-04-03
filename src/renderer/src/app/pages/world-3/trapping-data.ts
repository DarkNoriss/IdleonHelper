export type Critter = { value: string; label: string };
export type TrapConfig = { value: string; label: string; timers: string[] };

export const critters: Critter[] = [
  { value: "froge", label: "Froge" },
  { value: "crabbo", label: "Crabbo" },
  { value: "scorpie", label: "Scorpie" },
  { value: "mousey", label: "Mousey" },
  { value: "owlio", label: "Owlio" },
  { value: "pingy", label: "Pingy" },
  { value: "bunny", label: "Bunny" },
  { value: "dung_beat", label: "Dung Beat" },
  { value: "honker", label: "Honker" },
  { value: "blobfish", label: "Blobfish" },
  { value: "tuttle", label: "Tuttle" },
];

export const trapConfigs: TrapConfig[] = [
  {
    value: "cardboard",
    label: "Cardboard",
    timers: ["20m", "1h", "8h", "20h"],
  },
  {
    value: "silkskin",
    label: "Silkskin",
    timers: ["20m", "1h", "8h", "20h", "40h"],
  },
  { value: "wooden", label: "Wooden", timers: ["3h", "60h", "5d"] },
  { value: "natural", label: "Natural", timers: ["8h", "20h", "44h", "6d"] },
  { value: "steel", label: "Steel", timers: ["3h", "60h", "5d", "20h"] },
  { value: "meaty", label: "Meaty", timers: ["1h", "10h", "30h", "8d"] },
  {
    value: "royal",
    label: "Royal",
    timers: ["20m", "1h", "10h", "40h", "7d", "28d"],
  },
  {
    value: "egalitarian",
    label: "Egalitarian",
    timers: ["20m", "1h", "10h", "40h", "7d", "28d"],
  },
  {
    value: "forbidden",
    label: "Forbidden",
    timers: ["20m", "1h", "10h", "40h", "7d", "28d"],
  },
  {
    value: "containment_of_the_zrgyios",
    label: "Containment Of The Zrgyios",
    timers: ["20m", "1h", "10h", "40h", "7d", "28d"],
  },
  {
    value: "prehistoric",
    label: "Prehistoric",
    timers: ["20m", "1h", "10h", "40h", "7d", "28d"],
  },
];
