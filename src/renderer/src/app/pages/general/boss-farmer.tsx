import { useState } from "react";
import { ScriptPage } from "@/components/script-page";
import { Input } from "@/components/ui/input";
import { useMainState } from "@/hooks/use-main-state";

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const BossFarmer = () => {
  const [iterations, setIterations] = useState("100");
  const bossFarmer = useMainState("bossFarmer");
  const isRunning = bossFarmer?.running ?? false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.replace(/\D/g, "");
    setIterations(filtered);
  };

  const parsed = Number.parseInt(iterations, 10);

  return (
    <ScriptPage
      actions={[
        {
          label: "Start",
          scriptId: "general.bossFarmer.run",
          runningLabel: "Stop",
          args: () => [parsed],
        },
      ]}
      title="Boss Farmer"
    >
      <div className="mb-4 space-y-4">
        <div>
          <label
            className="mb-1.5 block font-medium text-sm"
            htmlFor="iterations"
          >
            Iterations
          </label>
          <Input
            className="w-[120px]"
            disabled={isRunning}
            id="iterations"
            onChange={handleChange}
            placeholder="100"
            value={iterations}
          />
        </div>

        {isRunning && bossFarmer && (
          <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium">
              Iteration {bossFarmer.iteration} / {bossFarmer.total}
            </p>
            <p className="text-muted-foreground">
              {bossFarmer.total - bossFarmer.iteration} remaining
            </p>
            {bossFarmer.avgIterationMs > 0 && (
              <>
                <p className="text-muted-foreground">
                  Avg per iteration: {formatDuration(bossFarmer.avgIterationMs)}
                </p>
                <p className="text-muted-foreground">
                  Estimated remaining:{" "}
                  {formatDuration(bossFarmer.estimatedRemainingMs)}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </ScriptPage>
  );
};

export default BossFarmer;
