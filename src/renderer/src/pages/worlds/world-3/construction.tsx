import * as React from "react"
import { useJsonDataStore } from "@/stores/json-data"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export const World3Construction = (): React.ReactElement => {
  const jsonData = useJsonDataStore((state) => state.jsonData)
  const setJsonData = useJsonDataStore((state) => state.setJsonData)
  const [textareaValue, setTextareaValue] = React.useState(jsonData || "")

  const handleSubmit = (): void => {
    setJsonData(textareaValue)
    setTextareaValue("")
  }

  return (
    <div className="flex h-full flex-col gap-4 p-8">
      <h1 className="text-3xl font-bold">World 3 - Construction</h1>
      <div className="flex flex-col gap-4">
        <Textarea
          placeholder="Enter JSON data here..."
          value={textareaValue}
          onChange={(e) => setTextareaValue(e.target.value)}
          className="min-h-[200px]"
        />
        <Button onClick={handleSubmit}>Set JSON Data</Button>
      </div>
    </div>
  )
}
