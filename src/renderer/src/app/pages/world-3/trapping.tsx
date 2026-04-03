import { useState } from "react";
import { ScriptPage } from "@/components/script-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { critters, trapConfigs } from "./trapping-data";

const TrapPlacingSection = () => {
  const [critter, setCritter] = useState<string>("");
  const [trap, setTrap] = useState<string>("");
  const [timer, setTimer] = useState<string>("");

  const selectedTrap = trapConfigs.find((t) => t.value === trap);

  const handleTrapChange = (value: string) => {
    setTrap(value);
    setTimer("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trap Placing</CardTitle>
      </CardHeader>
      <CardContent>
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

        <Button className="w-full" disabled size="sm">
          Place Trap (Coming soon)
        </Button>
      </CardContent>
    </Card>
  );
};

const TrapCollectingSection = () => {
  const [trap, setTrap] = useState<string>("");
  const [timer, setTimer] = useState<string>("");

  const selectedTrap = trapConfigs.find((t) => t.value === trap);

  const handleTrapChange = (value: string) => {
    setTrap(value);
    setTimer("");
  };

  const isReady = trap !== "" && timer !== "";

  return (
    <ScriptPage
      actions={
        isReady
          ? [
              {
                label: "Collect Traps",
                scriptId: "world3.trapping.collectTraps",
                runningLabel: "Collecting... (Click to stop)",
                args: () => [trap, timer],
              },
            ]
          : []
      }
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

      {!isReady && (
        <p className="mb-4 text-muted-foreground text-sm">
          Select trap type and timer to start collecting.
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
