import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
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
    <div className="flex flex-col gap-4 p-4">
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
      <Textarea
        className="flex-1 resize-none font-mono text-xs [field-sizing:fixed]"
        onChange={(e) => setLocalJson(e.target.value)}
        placeholder="Paste game data JSON here..."
        value={localJson}
      />
    </div>
  );
};

export default RawData;
