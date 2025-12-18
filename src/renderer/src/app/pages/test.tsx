import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Test = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>("")

  const handleNavigateToCodex = async () => {
    setLoading(true)
    setResult("")
    try {
      const success = await window.api.script.navigation.ui.toCodex()
      setResult(
        success
          ? "Navigation to codex completed successfully"
          : "Navigation to codex failed"
      )
    } catch (error) {
      setResult(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Button onClick={handleNavigateToCodex} disabled={loading}>
          {loading ? "Running..." : "Navigate to Codex"}
        </Button>
        {result && (
          <div className="bg-muted col-span-2 rounded-md p-4">
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
