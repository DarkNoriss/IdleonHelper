import { useEffect, useState } from "react";
import { Alert, PageHead, SmBtn } from "@/components/terminal";
import { useRawJsonStore } from "@/store/raw-json.ts";

const RawData = () => {
  const rawJson = useRawJsonStore((state) => state.rawJson);
  const setRawJson = useRawJsonStore((state) => state.setRawJson);
  const clearRawJson = useRawJsonStore((state) => state.clearRawJson);
  const [localJson, setLocalJson] = useState(rawJson);

  useEffect(() => {
    setLocalJson(rawJson);
  }, [rawJson]);

  const handleSave = () => {
    if (localJson.trim()) {
      setRawJson(localJson);
    }
  };

  const handleClear = () => {
    setLocalJson("");
    clearRawJson();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLocalJson(text);
    } catch {
      // ignore clipboard access failures
    }
  };

  return (
    <>
      <PageHead
        actions={
          <div className="flex gap-1">
            <SmBtn onClick={handlePaste}>paste</SmBtn>
            <SmBtn onClick={handleSave} primary>
              save
            </SmBtn>
            <SmBtn onClick={handleClear}>clear</SmBtn>
          </div>
        }
        description="Paste the raw JSON from idleontoolbox.com. Most scripts read this snapshot — keep it fresh after big in-game changes."
        path="raw-data"
        title="raw-data"
      />
      <Alert tone="info">
        in idleontoolbox → tools → raw-data → copy all. paste here, then save.
      </Alert>
      <div className="overflow-hidden rounded-[4px] border border-border bg-panel">
        <div className="flex justify-between border-border-soft border-b bg-panel-2 px-2.5 py-1 font-mono text-[10px] text-text-muted">
          <span>raw.json</span>
          <span>{localJson.length} chars</span>
        </div>
        <textarea
          className="h-[280px] w-full resize-none border-0 bg-background p-2.5 font-mono text-[10.5px] text-text-dim leading-[1.5] outline-none"
          onChange={(e) => setLocalJson(e.target.value)}
          placeholder="paste game data JSON here..."
          value={localJson}
        />
      </div>
    </>
  );
};

export default RawData;
