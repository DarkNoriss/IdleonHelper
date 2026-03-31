import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { parseConstruction } from "@/parsers/construction";
import { useRawJsonStore } from "@/store/raw-json";
import type { ParsedConstructionData } from "@/types/construction";

type GameDataContextType = {
  construction: ParsedConstructionData | null;
};

const GameDataContext = createContext<GameDataContextType>({
  construction: null,
});

export const useGameData = () => useContext(GameDataContext);

type GameDataProviderProps = {
  children: ReactNode;
};

export const GameDataProvider = ({ children }: GameDataProviderProps) => {
  const parsedJson = useRawJsonStore((state) => state.parsedJson);
  const [construction, setConstruction] =
    useState<ParsedConstructionData | null>(null);

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

  return (
    <GameDataContext.Provider value={{ construction }}>
      {children}
    </GameDataContext.Provider>
  );
};
