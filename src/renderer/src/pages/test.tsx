import * as React from "react"

import { Button } from "@/components/ui/button"

export const Test = (): React.ReactElement => {
  const [result, setResult] = React.useState<{
    success: boolean
    hwnd?: string
  } | null>(null)

  const handleTest = async (): Promise<void> => {
    try {
      const testResult = await window.api.test.runTest()
      setResult(testResult)
    } catch (err) {
      console.error("Test failed:", err)
      setResult({ success: false })
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Test Page</h1>
      <Button onClick={handleTest}>Run Test</Button>
      {result && (
        <div className="mt-4 flex flex-col gap-2">
          {result.success ? (
            <div className="rounded-md bg-green-500/10 p-4 text-green-600">
              <p className="font-semibold">Success!</p>
              <p>HWND: {result.hwnd}</p>
            </div>
          ) : (
            <div className="bg-destructive/10 text-destructive rounded-md p-4">
              <p className="font-semibold">Window not found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
