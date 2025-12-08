import * as React from "react"

export const Dashboard = (): React.ReactElement => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome to your dashboard</p>
      <p className="text-muted-foreground text-sm">
        Version 0.0.2 - Auto-update test!
      </p>
    </div>
  )
}
