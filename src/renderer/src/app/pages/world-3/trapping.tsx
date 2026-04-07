import { useEffect, useState } from "react";
import { ScriptPage } from "@/components/script-page.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useMainState } from "@/hooks/use-main-state.ts";
import { critters, trapConfigs } from "./trapping-data";

const formatCountdown = (ms: number): string => {
  if (ms <= 0) {
    return "0s";
  }
  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const TrapPlacingSection = () => {
  const [critter, setCritter] = useState<string>("");
  const [trap, setTrap] = useState<string>("");
  const [timer, setTimer] = useState<string>("");
  const placeTraps = useMainState("placeTraps");

  const selectedTrap = trapConfigs.find((t) => t.value === trap);

  const handleTrapChange = (value: string) => {
    setTrap(value);
    setTimer("");
  };

  return (
    <ScriptPage
      actions={[
        {
          label: "Place Traps",
          scriptId: "world3.trapping.placeTraps",
          runningLabel: "Placing... (Click to stop)",
          args: () => [critter, trap, timer],
        },
      ]}
      title="Trap Placing"
    >
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label
            className="mb-1.5 block font-medium text-sm"
            htmlFor="place-critter"
          >
            Critter
          </label>
          <Select onValueChange={setCritter} value={critter}>
            <SelectTrigger className="w-[200px]" id="place-critter">
              <SelectValue placeholder="Select critter" />
            </SelectTrigger>
            <SelectContent>
              {critters.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            className="mb-1.5 block font-medium text-sm"
            htmlFor="place-trap"
          >
            Trap Type
          </label>
          <Select onValueChange={handleTrapChange} value={trap}>
            <SelectTrigger className="w-[240px]" id="place-trap">
              <SelectValue placeholder="Select trap" />
            </SelectTrigger>
            <SelectContent>
              {trapConfigs.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            className="mb-1.5 block font-medium text-sm"
            htmlFor="place-timer"
          >
            Timer
          </label>
          <Select
            disabled={!selectedTrap}
            onValueChange={setTimer}
            value={timer}
          >
            <SelectTrigger className="w-[140px]" id="place-timer">
              <SelectValue placeholder="Select timer" />
            </SelectTrigger>
            <SelectContent>
              {selectedTrap?.timers.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {placeTraps?.current && (
        <p className="mb-4 font-medium text-sm">
          Placing for character {placeTraps.current}...
        </p>
      )}
    </ScriptPage>
  );
};

const TrapCollectingSection = () => {
  const [trap, setTrap] = useState<string>("");
  const [timer, setTimer] = useState<string>("");
  const [remaining, setRemaining] = useState<string | null>(null);
  const collectTraps = useMainState("collectTraps");

  const selectedTrap = trapConfigs.find((t) => t.value === trap);

  const handleTrapChange = (value: string) => {
    setTrap(value);
    setTimer("");
  };

  useEffect(() => {
    const endsAt = collectTraps?.endsAt;
    if (!endsAt) {
      setRemaining(null);
      return;
    }

    const update = () => {
      const diff = endsAt - Date.now();
      if (diff <= 0) {
        setRemaining(null);
      } else {
        setRemaining(formatCountdown(diff));
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [collectTraps?.endsAt]);

  return (
    <ScriptPage
      actions={[
        {
          label: "Collect Traps",
          scriptId: "world3.trapping.collectTraps",
          runningLabel: "Collecting... (Click to stop)",
          args: () => [trap, timer],
        },
      ]}
      title="Trap Collecting"
    >
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label
            className="mb-1.5 block font-medium text-sm"
            htmlFor="collect-trap"
          >
            Trap Type
          </label>
          <Select onValueChange={handleTrapChange} value={trap}>
            <SelectTrigger className="w-[240px]" id="collect-trap">
              <SelectValue placeholder="Select trap" />
            </SelectTrigger>
            <SelectContent>
              {trapConfigs.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            className="mb-1.5 block font-medium text-sm"
            htmlFor="collect-timer"
          >
            Timer
          </label>
          <Select
            disabled={!selectedTrap}
            onValueChange={setTimer}
            value={timer}
          >
            <SelectTrigger className="w-[140px]" id="collect-timer">
              <SelectValue placeholder="Select timer" />
            </SelectTrigger>
            <SelectContent>
              {selectedTrap?.timers.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {remaining && (
        <p className="mb-4 font-medium text-sm">
          Next collection in: {remaining}
        </p>
      )}
    </ScriptPage>
  );
};

const Trapping = () => {
  return (
    <div className="space-y-6">
      <TrapPlacingSection />
      <TrapCollectingSection />
    </div>
  );
};

export default Trapping;
