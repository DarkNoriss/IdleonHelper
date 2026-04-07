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
import { critters, trapConfigs } from "@/parsers/trapping";

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

type TrapTimerSelectsProps = {
  trap: string;
  onTrapChange: (value: string) => void;
  timer: string;
  onTimerChange: (value: string) => void;
  idPrefix: string;
};

const TrapTimerSelects = ({
  trap,
  onTrapChange,
  timer,
  onTimerChange,
  idPrefix,
}: TrapTimerSelectsProps) => {
  const selectedTrap = trapConfigs.find((t) => t.value === trap);

  return (
    <>
      <div>
        <label
          className="mb-1.5 block font-medium text-sm"
          htmlFor={`${idPrefix}-trap`}
        >
          Trap Type
        </label>
        <Select onValueChange={onTrapChange} value={trap}>
          <SelectTrigger id={`${idPrefix}-trap`}>
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
          htmlFor={`${idPrefix}-timer`}
        >
          Timer
        </label>
        <Select
          disabled={!selectedTrap}
          onValueChange={onTimerChange}
          value={timer}
        >
          <SelectTrigger id={`${idPrefix}-timer`}>
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
    </>
  );
};

const TrapPlacingSection = () => {
  const [critter, setCritter] = useState<string>("");
  const [trap, setTrap] = useState<string>("");
  const [timer, setTimer] = useState<string>("");
  const placeTraps = useMainState("placeTraps");

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
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <label
            className="mb-1.5 block font-medium text-sm"
            htmlFor="place-critter"
          >
            Critter
          </label>
          <Select onValueChange={setCritter} value={critter}>
            <SelectTrigger id="place-critter">
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

        <TrapTimerSelects
          idPrefix="place"
          onTimerChange={setTimer}
          onTrapChange={handleTrapChange}
          timer={timer}
          trap={trap}
        />
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
          args: () => [timer],
        },
      ]}
      title="Trap Collecting"
    >
      <div className="mb-4 grid grid-cols-2 gap-4">
        <TrapTimerSelects
          idPrefix="collect"
          onTimerChange={setTimer}
          onTrapChange={handleTrapChange}
          timer={timer}
          trap={trap}
        />
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
