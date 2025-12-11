import * as React from "react"
import { useWorkingStore } from "@/stores/working"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

import { Button } from "./ui/button"

type ButtonWorkingActionProps = Omit<
  React.ComponentProps<typeof Button>,
  "onClick" | "children"
> & {
  actionKey: string
  label: string
  workingLabel: string
  className?: string
  icon: React.ReactElement
  workingIcon?: React.ReactElement
  onAction: () => boolean
  allowCancel?: boolean
  cancelLabel?: string
  cancelIcon?: React.ReactElement
  onCancel?: () => void
}

export const ButtonWorkingAction = ({
  actionKey,
  label,
  workingLabel,
  className,
  icon,
  workingIcon,
  allowCancel = false,
  cancelLabel = "Cancel",
  cancelIcon = <Loader2 className="size-4 animate-spin" />,
  onCancel,
  disabled,
  onAction,
  ...buttonProps
}: ButtonWorkingActionProps): React.ReactElement => {
  const { isWorking, currentAction, startWorking } = useWorkingStore()

  const isCurrentAction = isWorking && currentAction === actionKey
  const isBlockedByOtherAction = isWorking && currentAction !== actionKey

  const handleClick = (): void => {
    if (isCurrentAction && allowCancel) {
      onCancel?.()
      return
    }

    const didStart = onAction()
    if (didStart) {
      startWorking(actionKey)
    }
  }

  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      disabled={
        disabled || isBlockedByOtherAction || (isCurrentAction && !allowCancel)
      }
      className={cn("w-full", className)}
    >
      {isCurrentAction
        ? allowCancel
          ? cancelIcon
          : (workingIcon ?? <Loader2 className="size-4 animate-spin" />)
        : icon}
      {isCurrentAction ? (allowCancel ? cancelLabel : workingLabel) : label}
    </Button>
  )
}
