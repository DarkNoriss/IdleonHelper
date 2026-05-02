import { useState } from "react";
import {
  Alert,
  Block,
  BlockActions,
  PageHead,
  RunBtn,
  SmBtn,
} from "@/components/terminal";
import { useMainState } from "@/hooks/use-main-state.ts";

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const WeeklyBattle = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weeklyBattle = useMainState("weeklyBattle");
  const data = weeklyBattle?.data ?? null;

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.api.script.world2.weeklyBattle.fetch();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch weekly battle data"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        actions={
          <SmBtn disabled={loading} onClick={handleFetch}>
            {loading ? "…fetching" : "↻ refetch"}
          </SmBtn>
        }
        path="world-2 / weekly-battle"
        title="weekly-battle"
      />
      {error && <Alert tone="danger">{error}</Alert>}
      <Block tag="data" title="current-battle">
        {data ? (
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="font-medium text-[13px] text-foreground">
              {data.info.bossName}
            </span>
            <span className="text-text-dim">
              {formatDate(data.info.dateFrom)} → {formatDate(data.info.dateTo)}
            </span>
          </div>
        ) : (
          <div className="font-mono text-[11px] text-text-muted">
            no data yet — click refetch
          </div>
        )}
      </Block>
      {data?.info.steps && data.info.steps.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {data.info.steps.map((step, index) => {
            const isSkulls = step.stepName.toLowerCase().includes("skull");
            const label = isSkulls ? "start skulls" : "start trophy";
            return (
              <Block
                compact
                key={`${index}-${step.stepName}`}
                tag="script"
                title={`${step.stepName
                  .toLowerCase()
                  .replaceAll(" ", "-")}-run`}
              >
                <div className="font-mono text-[10px] text-text-muted leading-[1.6]">
                  {step.rawSteps && step.rawSteps.length > 0 ? (
                    step.rawSteps.map((rawStep, stepIndex) => (
                      <div key={`${stepIndex}-${rawStep}`}>› {rawStep}</div>
                    ))
                  ) : (
                    <div>no steps available</div>
                  )}
                </div>
                <BlockActions>
                  <RunBtn
                    getArgs={() => [step.steps]}
                    label={label}
                    scriptId="world2.weeklyBattle.run"
                  />
                </BlockActions>
              </Block>
            );
          })}
        </div>
      )}
    </>
  );
};

export default WeeklyBattle;
