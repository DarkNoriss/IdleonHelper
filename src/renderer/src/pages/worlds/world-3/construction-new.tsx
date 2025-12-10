import { useAccountDataStore } from "@/stores/account-data"

import { ScoreCardNew } from "./score-card-new"

export const ConstructionNew = (): React.ReactElement => {
  const { accountData } = useAccountDataStore()
  const { construction } = accountData ?? {}
  const { totalBuildRate, totalExpRate, totalFlaggyRate } = construction ?? {}

  console.log({ construction })

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <ScoreCardNew
        buildRate={totalBuildRate ?? 0}
        expBonus={totalExpRate ?? 0}
        flaggy={totalFlaggyRate ?? 0}
      />
    </div>
  )
}
