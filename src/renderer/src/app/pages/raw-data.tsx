import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useRawJsonStore } from "@/store/raw-json.ts";

const RawData = () => {
  const rawJson = useRawJsonStore((state) => state.rawJson);
  const setRawJson = useRawJsonStore((state) => state.setRawJson);
  const clearRawJson = useRawJsonStore((state) => state.clearRawJson);
  const [localJson, setLocalJson] = useState(rawJson);

  // Sync local state with store when store changes externally
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
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">Raw Data</h1>
        <div className="flex gap-2">
          <Button onClick={handlePaste} variant="outline">
            Paste
          </Button>
          <Button onClick={handleSave} variant="default">
            Save
          </Button>
          <Button onClick={handleClear} variant="outline">
            Clear
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 rounded-lg border">
        <Textarea
          className="w-full resize-none border-0 font-mono text-xs focus-visible:ring-0"
          onChange={(e) => setLocalJson(e.target.value)}
          placeholder="Paste game data JSON here..."
          value={localJson}
        />
      </ScrollArea>
    </div>
  );
};

export default RawData;
