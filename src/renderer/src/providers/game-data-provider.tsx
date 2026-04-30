import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { type BossFarmerData, parseBossFarmer } from "@/parsers/boss-farmer";
import { parseCompass } from "@/parsers/compass";
import { parseConstruction } from "@/parsers/construction";
import { parseSushiStation } from "@/parsers/sushi-station";
import { useRawJsonStore } from "@/store/raw-json.ts";
import type { CompassData } from "@/types/compass";
import type { ParsedConstructionData } from "@/types/construction";
import type { SushiStationData } from "@/types/sushi-station";

type GameDataContextType = {
  construction: ParsedConstructionData | null;
  bossFarmer: BossFarmerData | null;
  sushiStation: SushiStationData | null;
  compass: CompassData | null;
};

const GameDataContext = createContext<GameDataContextType>({
  construction: null,
  bossFarmer: null,
  sushiStation: null,
  compass: null,
});

export const useGameData = () => useContext(GameDataContext);

type GameDataProviderProps = {
  children: ReactNode;
};

export const GameDataProvider = ({ children }: GameDataProviderProps) => {
  const parsedJson = useRawJsonStore((state) => state.parsedJson);
  const [construction, setConstruction] =
    useState<ParsedConstructionData | null>(null);
  const [bossFarmer, setBossFarmer] = useState<BossFarmerData | null>(null);
  const [sushiStation, setSushiStation] = useState<SushiStationData | null>(
    null
  );
  const [compass, setCompass] = useState<CompassData | null>(null);

  useEffect(() => {
    if (!parsedJson) {
      setConstruction(null);
      return;
    }
    try {
      setConstruction(parseConstruction(parsedJson));
    } catch (error) {
      console.error("Failed to parse construction data:", error);
      setConstruction(null);
    }
  }, [parsedJson]);

  useEffect(() => {
    if (!parsedJson) {
      setBossFarmer(null);
      return;
    }
    try {
      setBossFarmer(parseBossFarmer(parsedJson));
    } catch (error) {
      console.error("Failed to parse boss-farmer data:", error);
      setBossFarmer(null);
    }
  }, [parsedJson]);

  useEffect(() => {
    if (!parsedJson) {
      setSushiStation(null);
      return;
    }
    try {
      setSushiStation(parseSushiStation(parsedJson));
    } catch (error) {
      console.error("Failed to parse sushi-station data:", error);
      setSushiStation(null);
    }
  }, [parsedJson]);

  useEffect(() => {
    if (!parsedJson) {
      setCompass(null);
      return;
    }
    try {
      setCompass(parseCompass(parsedJson));
    } catch (error) {
      console.error("Failed to parse compass data:", error);
      setCompass(null);
    }
  }, [parsedJson]);

  return (
    <GameDataContext.Provider
      value={{ construction, bossFarmer, sushiStation, compass }}
    >
      {children}
    </GameDataContext.Provider>
  );
};
