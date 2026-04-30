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
  OptimizerCategory,
  OptimizerGroupMode,
  OptimizerMaxSteps,
} from "@/types/sushi-station";

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
};
type CompassOptimizerPrefs = {
  category: CompassCategory;
  rph: CompassRphRates;
  dustFilter: CompassDustFilter;
  maxSteps: number;
  groupMode: OptimizerGroupMode;
  onlyAffordable: boolean;
};

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
  compassOptimizer: CompassOptimizerPrefs;

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
  setCompassOptimizer: (patch: Partial<CompassOptimizerPrefs>) => void;
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
      },
      compassOptimizer: {
        category: "damage",
        rph: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 },
        dustFilter: "all",
        maxSteps: 25,
        groupMode: "none",
        onlyAffordable: false,
      },

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
      setCompassOptimizer: (patch) =>
        set((s) => ({
          compassOptimizer: { ...s.compassOptimizer, ...patch },
        })),
    }),
    {
      name: "ui-prefs-storage",
    }
  )
);
