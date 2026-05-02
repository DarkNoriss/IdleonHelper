import { Tooltip } from "@base-ui/react/tooltip";
import {
  Block,
  Field,
  PageHead,
  RunBtn,
  TermInput,
} from "@/components/terminal";
import { DisabledHint } from "@/components/terminal/disabled-hint";
import { useMainState } from "@/hooks/use-main-state.ts";
import { useGameData } from "@/providers/game-data-provider";
import { useUiPrefsStore } from "@/store/ui-prefs.ts";

const formatDuration = (ms: number, precise = false): string => {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const sec = precise ? seconds.toFixed(1) : Math.round(seconds);
  if (minutes > 0) {
    return `${minutes}m ${sec}s`;
  }
  return `${sec}s`;
};

const BossFarmer = () => {
  const iterations = useUiPrefsStore((s) => s.bossFarmer.iterations);
  const setBossFarmer = useUiPrefsStore((s) => s.setBossFarmer);
  const bossFarmer = useMainState("bossFarmer");
  const isRunning = bossFarmer?.running ?? false;
  const parsed = Number.parseInt(iterations, 10);

  const { bossFarmer: gemData } = useGameData();
  const remaining = gemData?.gemBossKillsRemaining ?? 0;
  const gemDisabled = remaining === 0;

  return (
    <>
      <PageHead path="general / boss-farmer" title="boss-farmer" />
      <Block
        note="open the boss-select menu in-game. set your boss and difficulty first, then return here."
        tag="script"
        title="boss.run"
      >
        <div className="flex items-end gap-2.5">
          <Field label="iterations" width="w-[120px]">
            <TermInput
              disabled={isRunning}
              onChange={(v) =>
                setBossFarmer({ iterations: v.replace(/\D/g, "") })
              }
              placeholder="150"
              value={iterations}
            />
          </Field>
          <RunBtn
            disabled={!parsed}
            getArgs={() => [parsed]}
            label="start boss-farmer"
            scriptId="general.bossFarmer.run"
          />
          {gemDisabled ? (
            <DisabledHint
              disabled
              popover="no daily gems available from bosses"
            >
              <RunBtn
                disabled
                getArgs={() => [remaining]}
                label="start gem farming"
                scriptId="general.gemBossFarmer.run"
              />
            </DisabledHint>
          ) : (
            <Tooltip.Root>
              <Tooltip.Trigger
                render={<span className="relative inline-flex" />}
              >
                <RunBtn
                  getArgs={() => [remaining]}
                  label="start gem farming"
                  scriptId="general.gemBossFarmer.run"
                />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner align="center" side="top" sideOffset={6}>
                  <Tooltip.Popup className="z-40 rounded-[4px] border border-border bg-panel px-2.5 py-[7px] font-mono text-[10px] text-text-dim leading-[1.55] shadow-[0_8px_22px_rgba(0,0,0,0.55)]">
                    {remaining} kills available today
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </div>
        {isRunning && bossFarmer && (
          <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-[3px] border border-border-soft bg-panel-2 p-2.5 font-mono text-[10.5px]">
            <span className="text-text-dim">
              iteration:{" "}
              <span className="text-foreground">
                {bossFarmer.iteration} / {bossFarmer.total}
              </span>
            </span>
            <span className="text-text-dim">
              remaining:{" "}
              <span className="text-foreground">
                {bossFarmer.total - bossFarmer.iteration}
              </span>
            </span>
            {bossFarmer.avgIterationMs > 0 && (
              <>
                <span className="text-text-dim">
                  avg:{" "}
                  <span className="text-foreground">
                    {formatDuration(bossFarmer.avgIterationMs, true)}
                  </span>
                </span>
                <span className="text-text-dim">
                  eta:{" "}
                  <span className="text-foreground">
                    {formatDuration(bossFarmer.estimatedRemainingMs)}
                  </span>
                </span>
              </>
            )}
          </div>
        )}
      </Block>
    </>
  );
};

export default BossFarmer;
