import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Selections } from "@/types/alchemy";
import type {
  CompassCategory,
  CompassDustFilter,
  CompassRphRates,
} from "@/types/compass";
import type { SolverFocus } from "@/types/construction";
import type {
  GrimoireBoneFilter,
  GrimoireCategory,
  GrimoireRphRates,
} from "@/types/grimoire";
import type {
  OptimizerCategory,
  OptimizerGroupMode,
  OptimizerMaxSteps,
} from "@/types/sushi-station";
import type {
  TesseractCategory,
  TesseractRphRates,
  TesseractTachyonFilter,
} from "@/types/tesseract";

type CandyPrefs = { duration: string };
type BossFarmerPrefs = { iterations: string };
type CardsPrefs = { slot: string };
type AlchemyPrefs = { selections: Selections; intervalMinutes: number };
type ConstructionPrefs = { focus: SolverFocus };
type TrappingPlacePrefs = { critter: string; trap: string; timer: string };
type TrappingCollectPrefs = { trap: string; timer: string };
type TrappingPrefs = {
  place: TrappingPlacePrefs;
  collect: TrappingCollectPrefs;
};
type FarmingPrefs = { overgrowth: string };
type SushiPrefs = { shouldCook: boolean };
type SushiHeatOfTheEastWindPrefs = {
  shouldCook: boolean;
  mergeAboveHotew: boolean;
};
type SushiOptimizerPrefs = {
  category: OptimizerCategory;
  maxSteps: OptimizerMaxSteps;
  onlyAffordable: boolean;
  groupMode: OptimizerGroupMode;
  dryRun: boolean;
};
type CompassOptimizerPrefs = {
  category: CompassCategory;
  rph: CompassRphRates;
  dustFilter: CompassDustFilter;
  maxSteps: number;
  groupMode: OptimizerGroupMode;
  onlyAffordable: boolean;
};
type TesseractOptimizerPrefs = {
  category: TesseractCategory;
  rph: TesseractRphRates;
  tachyonFilter: TesseractTachyonFilter;
  maxSteps: number;
  groupMode: OptimizerGroupMode;
  onlyAffordable: boolean;
};
type GrimoireOptimizerPrefs = {
  category: GrimoireCategory;
  rph: GrimoireRphRates;
  boneFilter: GrimoireBoneFilter;
  maxSteps: number;
  groupMode: OptimizerGroupMode;
  onlyAffordable: boolean;
};
// Timestamp of the last upgrader run; used by the tab to gate the run
// button until a fresh cloudsave (`lastUpdated > lastRunAt`) has landed.
type UpgraderRunState = { lastRunAt: number | null };

type UiPrefsState = {
  candy: CandyPrefs;
  bossFarmer: BossFarmerPrefs;
  cards: CardsPrefs;
  alchemy: AlchemyPrefs;
  construction: ConstructionPrefs;
  trapping: TrappingPrefs;
  farming: FarmingPrefs;
  sushi: SushiPrefs;
  sushiHeatOfTheEastWind: SushiHeatOfTheEastWindPrefs;
  sushiOptimizer: SushiOptimizerPrefs;
  sushiUpgraderRun: UpgraderRunState;
  compassOptimizer: CompassOptimizerPrefs;
  compassUpgraderRun: UpgraderRunState;
  tesseractOptimizer: TesseractOptimizerPrefs;
  tesseractUpgraderRun: UpgraderRunState;
  grimoireOptimizer: GrimoireOptimizerPrefs;
  grimoireUpgraderRun: UpgraderRunState;

  setCandy: (patch: Partial<CandyPrefs>) => void;
  setBossFarmer: (patch: Partial<BossFarmerPrefs>) => void;
  setCards: (patch: Partial<CardsPrefs>) => void;
  setAlchemy: (patch: Partial<AlchemyPrefs>) => void;
  setConstruction: (patch: Partial<ConstructionPrefs>) => void;
  setTrappingPlace: (patch: Partial<TrappingPlacePrefs>) => void;
  setTrappingCollect: (patch: Partial<TrappingCollectPrefs>) => void;
  setFarming: (patch: Partial<FarmingPrefs>) => void;
  setSushi: (patch: Partial<SushiPrefs>) => void;
  setSushiHeatOfTheEastWind: (
    patch: Partial<SushiHeatOfTheEastWindPrefs>
  ) => void;
  setSushiOptimizer: (patch: Partial<SushiOptimizerPrefs>) => void;
  setSushiUpgraderRun: (patch: Partial<UpgraderRunState>) => void;
  setCompassOptimizer: (patch: Partial<CompassOptimizerPrefs>) => void;
  setCompassUpgraderRun: (patch: Partial<UpgraderRunState>) => void;
  setTesseractOptimizer: (patch: Partial<TesseractOptimizerPrefs>) => void;
  setTesseractUpgraderRun: (patch: Partial<UpgraderRunState>) => void;
  setGrimoireOptimizer: (patch: Partial<GrimoireOptimizerPrefs>) => void;
  setGrimoireUpgraderRun: (patch: Partial<UpgraderRunState>) => void;
};

const INITIAL_ALCHEMY_SELECTIONS: Selections = {
  power: null,
  quicc: null,
  highIq: null,
  kazam: null,
};

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      candy: { duration: "1h" },
      bossFarmer: { iterations: "150" },
      cards: { slot: "1" },
      alchemy: {
        selections: INITIAL_ALCHEMY_SELECTIONS,
        intervalMinutes: 5,
      },
      construction: { focus: "exp" },
      trapping: {
        place: { critter: "", trap: "", timer: "" },
        collect: { trap: "", timer: "" },
      },
      farming: { overgrowth: "0" },
      sushi: { shouldCook: true },
      sushiHeatOfTheEastWind: { shouldCook: false, mergeAboveHotew: false },
      sushiOptimizer: {
        category: "all",
        maxSteps: 25,
        onlyAffordable: false,
        groupMode: "none",
        dryRun: true,
      },
      sushiUpgraderRun: { lastRunAt: null },
      compassOptimizer: {
        category: "all",
        rph: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 },
        dustFilter: "all",
        maxSteps: 25,
        groupMode: "none",
        onlyAffordable: false,
      },
      compassUpgraderRun: { lastRunAt: null },
      tesseractOptimizer: {
        category: "all",
        rph: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
        tachyonFilter: "all",
        maxSteps: 25,
        groupMode: "none",
        onlyAffordable: false,
      },
      tesseractUpgraderRun: { lastRunAt: null },
      grimoireOptimizer: {
        category: "all",
        rph: { 0: 1, 1: 1, 2: 1, 3: 1 },
        boneFilter: "all",
        maxSteps: 25,
        groupMode: "none",
        onlyAffordable: false,
      },
      grimoireUpgraderRun: { lastRunAt: null },

      setCandy: (patch) => set((s) => ({ candy: { ...s.candy, ...patch } })),
      setBossFarmer: (patch) =>
        set((s) => ({ bossFarmer: { ...s.bossFarmer, ...patch } })),
      setCards: (patch) => set((s) => ({ cards: { ...s.cards, ...patch } })),
      setAlchemy: (patch) =>
        set((s) => ({ alchemy: { ...s.alchemy, ...patch } })),
      setConstruction: (patch) =>
        set((s) => ({ construction: { ...s.construction, ...patch } })),
      setTrappingPlace: (patch) =>
        set((s) => ({
          trapping: {
            ...s.trapping,
            place: { ...s.trapping.place, ...patch },
          },
        })),
      setTrappingCollect: (patch) =>
        set((s) => ({
          trapping: {
            ...s.trapping,
            collect: { ...s.trapping.collect, ...patch },
          },
        })),
      setFarming: (patch) =>
        set((s) => ({ farming: { ...s.farming, ...patch } })),
      setSushi: (patch) => set((s) => ({ sushi: { ...s.sushi, ...patch } })),
      setSushiHeatOfTheEastWind: (patch) =>
        set((s) => ({
          sushiHeatOfTheEastWind: { ...s.sushiHeatOfTheEastWind, ...patch },
        })),
      setSushiOptimizer: (patch) =>
        set((s) => ({
          sushiOptimizer: { ...s.sushiOptimizer, ...patch },
        })),
      setSushiUpgraderRun: (patch) =>
        set((s) => ({
          sushiUpgraderRun: { ...s.sushiUpgraderRun, ...patch },
        })),
      setCompassOptimizer: (patch) =>
        set((s) => ({
          compassOptimizer: { ...s.compassOptimizer, ...patch },
        })),
      setCompassUpgraderRun: (patch) =>
        set((s) => ({
          compassUpgraderRun: { ...s.compassUpgraderRun, ...patch },
        })),
      setTesseractOptimizer: (patch) =>
        set((s) => ({
          tesseractOptimizer: { ...s.tesseractOptimizer, ...patch },
        })),
      setTesseractUpgraderRun: (patch) =>
        set((s) => ({
          tesseractUpgraderRun: { ...s.tesseractUpgraderRun, ...patch },
        })),
      setGrimoireOptimizer: (patch) =>
        set((s) => ({
          grimoireOptimizer: { ...s.grimoireOptimizer, ...patch },
        })),
      setGrimoireUpgraderRun: (patch) =>
        set((s) => ({
          grimoireUpgraderRun: { ...s.grimoireUpgraderRun, ...patch },
        })),
    }),
    {
      name: "ui-prefs-storage",
    }
  )
);
