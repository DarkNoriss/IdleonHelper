import * as React from "react"
import { Loader2 } from "lucide-react"

import { useWorkingStore } from "@/stores/working"

import { Button } from "./ui/button"

type ButtonWorkingActionProps = Omit<
  React.ComponentProps<typeof Button>,
  "onClick" | "children"
> & {
  actionKey: string
  label: string
  workingLabel: string
  icon: React.ReactElement
  workingIcon?: React.ReactElement
  onAction: () => boolean
}

export const ButtonWorkingAction = ({
  actionKey,
  label,
  workingLabel,
  icon,
  workingIcon,
  disabled,
  onAction,
  ...buttonProps
}: ButtonWorkingActionProps): React.ReactElement => {
  const { isWorking, currentAction, startWorking } = useWorkingStore()

  const isCurrentAction = isWorking && currentAction === actionKey
  const isBlockedByOtherAction = isWorking && currentAction !== actionKey

  const handleClick = (): void => {
    const didStart = onAction()
    if (didStart) {
      startWorking(actionKey)
    }
  }

  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      disabled={disabled || isCurrentAction || isBlockedByOtherAction}
    >
      {isCurrentAction
        ? workingIcon ?? <Loader2 className="size-4 animate-spin" />
        : icon}
      {isCurrentAction ? workingLabel : label}
    </Button>
  )
}

