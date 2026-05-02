import { Alert, PageHead, SmBtn } from "@/components/terminal";
import { refreshCloudsave } from "@/providers/auth-provider";
import { useIsSignedIn } from "@/store/connection";
import { useRawJsonStore } from "@/store/raw-json.ts";

const RawData = () => {
  const rawJson = useRawJsonStore((state) => state.rawJson);
  const isSignedIn = useIsSignedIn();

  const handleSave = () => {
    if (!isSignedIn) {
      return;
    }
    refreshCloudsave().catch(() => {
      // errors surface via the connection store
    });
  };

  return (
    <>
      <PageHead
        actions={
          <div className="flex gap-1">
            <SmBtn disabled={!isSignedIn} onClick={handleSave} primary>
              save
            </SmBtn>
          </div>
        }
        path="raw-data"
        title="raw-data"
      />
      <Alert tone="info">
        dev-only debug view. data auto-syncs from firebase via the snapshot
        listener — this page just shows what zustand currently holds.
      </Alert>
      <div className="overflow-hidden rounded-[4px] border border-border bg-panel">
        <div className="flex justify-between border-border-soft border-b bg-panel-2 px-2.5 py-1 font-mono text-[10px] text-text-muted">
          <span>raw.json</span>
          <span>{rawJson.length} chars</span>
        </div>
        <textarea
          className="h-[280px] w-full resize-none border-0 bg-background p-2.5 font-mono text-[10.5px] text-text-dim leading-[1.5] outline-none"
          readOnly
          value={rawJson}
        />
      </div>
    </>
  );
};

export default RawData;
