export const backendConfig = {
  find: {
    timeoutMs: 5000,
    intervalMs: 100,
    threshold: 0.925,
  },
  isVisible: {
    timeoutMs: 100,
  },
  click: {
    times: 1,
    interval: 240,
    holdTime: 120,
  },
  drag: {
    stepSize: 6,
    stepDelay: 2,
  },
} as const

export enum ClickPreset {
  Standard = "Standard",
  Fast = "Fast",
  Slow = "Slow",
  UltraFast = "UltraFast",
}

export const getClickOptionsFromPreset = (
  preset: ClickPreset
): { interval: number; holdTime: number } => {
  const standardInterval = backendConfig.click.interval
  const standardHoldTime = backendConfig.click.holdTime

  switch (preset) {
    case ClickPreset.Standard:
      return { interval: standardInterval, holdTime: standardHoldTime }
    case ClickPreset.Fast:
      return {
        interval: standardInterval / 2,
        holdTime: standardHoldTime / 2,
      }
    case ClickPreset.UltraFast:
      return {
        interval: standardInterval / 4,
        holdTime: standardHoldTime / 4,
      }
    case ClickPreset.Slow:
      return {
        interval: standardInterval * 2,
        holdTime: standardHoldTime * 2,
      }
    default:
      return { interval: standardInterval, holdTime: standardHoldTime }
  }
}
