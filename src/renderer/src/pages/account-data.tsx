import * as React from "react"
import { useAccountDataStore } from "@/stores/account-data"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export const AccountData = (): React.ReactElement => {
  const { rawJson, setRawJson } = useAccountDataStore()
  const [textareaValue, setTextareaValue] = React.useState(
    JSON.stringify(rawJson) ?? ""
  )

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Account Data</CardTitle>
      </CardHeader>

      <CardContent>
        <Textarea
          variant="sm"
          placeholder="Enter JSON data here..."
          value={textareaValue}
          onChange={(e) => setTextareaValue(e.target.value)}
          className="flex-1"
        />

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setRawJson(textareaValue)}
            disabled={!textareaValue.trim()}
          >
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
