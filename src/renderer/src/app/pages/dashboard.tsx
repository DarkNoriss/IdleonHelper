import { useEffect, useRef, useState } from "react";
import { Alert, Block, PageHead, QuickTile, Stat } from "@/components/terminal";
import { useMainState } from "@/hooks/use-main-state.ts";
import { useIsSignedIn } from "@/store/connection";
import { useNavigationStore } from "@/store/navigation.ts";

const formatSession = (ms: number): string => {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) {
    return `${totalMin}m`;
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
};

const Dashboard = () => {
  const setPage = useNavigationStore((s) => s.setPage);
  const queue = useMainState("queue");
  const running = queue?.runningItem ?? null;
  const queuedCount = (queue?.queue ?? []).filter(
    (i) => i.status === "queued"
  ).length;

  const [lastRun, setLastRun] = useState<string | null>(null);
  const prevRunningName = useRef<string | null>(null);
  useEffect(() => {
    if (running) {
      prevRunningName.current = running.scriptName;
    } else if (prevRunningName.current) {
      setLastRun(prevRunningName.current);
      prevRunningName.current = null;
    }
  }, [running]);

  const startRef = useRef(Date.now());
  const [session, setSession] = useState("0m");
  useEffect(() => {
    // Display is minute-granular, so polling every 30s is more than enough.
    const t = setInterval(() => {
      setSession(formatSession(Date.now() - startRef.current));
    }, 30_000);
    setSession(formatSession(Date.now() - startRef.current));
    return () => clearInterval(t);
  }, []);

  const isSignedIn = useIsSignedIn();

  const goto = (page: Parameters<typeof setPage>[0]) => () => setPage(page);

  return (
    <>
      <PageHead
        description="System overview. Scripts queue and run one-at-a-time — switch your game to the target character before starting."
        path="dashboard"
        title="dashboard"
      />
      {!isSignedIn && (
        <Alert tone="warn">
          not signed in — game data won't sync from firebase. open the profile
          menu in the title bar to sign in with google. scripts that need synced
          data will be locked until then.
        </Alert>
      )}
      <div className="mb-2.5 grid grid-cols-4 gap-2">
        <Stat
          label="engine"
          tone={running ? "var(--primary)" : "var(--text-dim)"}
          value={running ? "running" : "idle"}
        />
        <Stat
          label="queue"
          value={running ? `1+${queuedCount}` : String(queuedCount)}
        />
        <Stat label="session" value={session} />
        <Stat label="last-run" value={lastRun ?? "—"} />
      </div>
      <Block tag="scripts" title="quick-launch">
        <div className="grid grid-cols-3 gap-1.5">
          <QuickTile
            desc="burn time candy"
            label="candy"
            onClick={goto("general/candy")}
          />
          <QuickTile
            desc="rotate daily stores"
            label="store-items"
            onClick={goto("general/store-items")}
          />
          <QuickTile
            desc="place + collect"
            label="trapping"
            onClick={goto("world3/trapping")}
          />
          <QuickTile
            desc="optimize board"
            label="construction"
            onClick={goto("world3/construction")}
          />
          <QuickTile
            desc="merge sushi"
            label="sushi-station"
            onClick={goto("world7/sushi-station")}
          />
          <QuickTile
            desc="autobattler"
            label="summoning"
            onClick={goto("world6/summoning")}
          />
        </div>
      </Block>
    </>
  );
};

export default Dashboard;
