import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ScoreCardProps = {
  buildRate: string
  expBonus: string
  flaggy: string
  afterBuildRate?: string
  afterExpBonus?: string
  afterFlaggy?: string
  buildRateDiff?: string
  expBonusDiff?: string
  flaggyDiff?: string
}

export const ScoreCard = ({
  buildRate,
  expBonus,
  flaggy,
  afterBuildRate,
  afterExpBonus,
  afterFlaggy,
  buildRateDiff,
  expBonusDiff,
  flaggyDiff,
}: ScoreCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 justify-between">
          <div className="flex flex-col items-center">
            <div className="text-base font-bold">Build Rate</div>
            <div
              className={cn(
                "text-lg font-bold",
                afterBuildRate ? "text-green-500" : "0"
              )}
            >
              {afterBuildRate ? afterBuildRate : buildRate}
            </div>
            {buildRateDiff && (
              <div className="text-sm text-gray-500">{buildRateDiff}</div>
            )}
            {afterBuildRate && (
              <div className="text-sm text-gray-500">{buildRate}</div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <div className="text-base font-bold">Exp Bonus</div>
            <div
              className={cn(
                "text-lg font-bold",
                afterExpBonus ? "text-green-500" : ""
              )}
            >
              {afterExpBonus ? afterExpBonus : expBonus}
            </div>
            {expBonusDiff && (
              <div className="text-sm text-gray-500">{expBonusDiff}</div>
            )}
            {afterExpBonus && (
              <div className="text-sm text-gray-500">{expBonus}</div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <div className="text-base font-bold">Flaggy</div>
            <div
              className={cn(
                "text-lg font-bold",
                afterFlaggy ? "text-green-500" : ""
              )}
            >
              {afterFlaggy ? afterFlaggy : flaggy}
            </div>
            {flaggyDiff && (
              <div className="text-sm text-gray-500">{flaggyDiff}</div>
            )}
            {afterFlaggy && (
              <div className="text-sm text-gray-500">{flaggy}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
