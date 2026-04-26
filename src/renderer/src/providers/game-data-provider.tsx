import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { type BossFarmerData, parseBossFarmer } from "@/parsers/boss-farmer";
import { parseConstruction } from "@/parsers/construction";
import { useRawJsonStore } from "@/store/raw-json.ts";
import type { ParsedConstructionData } from "@/types/construction";

type GameDataContextType = {
  construction: ParsedConstructionData | null;
  bossFarmer: BossFarmerData | null;
};

const GameDataContext = createContext<GameDataContextType>({
  construction: null,
  bossFarmer: null,
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

  return (
    <GameDataContext.Provider value={{ construction, bossFarmer }}>
      {children}
    </GameDataContext.Provider>
  );
};
