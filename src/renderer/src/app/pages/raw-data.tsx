import { useEffect, useState } from "react"
import { useRawJsonStore } from "@/store/raw-json"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export const RawData = () => {
  const rawJson = useRawJsonStore((state) => state.rawJson)
  const setRawJson = useRawJsonStore((state) => state.setRawJson)
  const clearRawJson = useRawJsonStore((state) => state.clearRawJson)
  const [localJson, setLocalJson] = useState(rawJson)

  // Sync local state with store when store changes externally
  useEffect(() => {
    setLocalJson(rawJson)
  }, [rawJson])

  const handleSave = () => {
    if (localJson.trim()) {
      setRawJson(localJson)
    }
  }

  const handleClear = () => {
    setLocalJson("")
    clearRawJson()
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Raw Data</h1>
        <div className="flex gap-2">
          <Button onClick={handleSave} variant="default">
            Save
          </Button>
          <Button onClick={handleClear} variant="outline">
            Clear
          </Button>
        </div>
      </div>
      <Textarea
        value={localJson}
        onChange={(e) => setLocalJson(e.target.value)}
        placeholder="Paste game data JSON here..."
        className="flex-1 resize-none font-mono text-xs"
        rows={23}
      />
    </div>
  )
}
