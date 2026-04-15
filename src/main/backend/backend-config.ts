export const backendConfig = {
  find: {
    timeoutMs: 5000,
    intervalMs: 50,
    threshold: 0.925,
  },
  isVisible: {
    timeoutMs: 50,
    intervalMs: 50,
  },
  click: {
    times: 1,
    interval: 80,
    holdTime: 80,
  },
  drag: {
    stepSize: 6,
    stepDelay: 2,
  },
} as const;

export type ClickPreset = "0.5x" | "1x" | "2x" | "4x" | "8x" | "16x";

const PRESET_MULTIPLIERS: Record<ClickPreset, number> = {
  "0.5x": 0.5,
  "1x": 1,
  "2x": 2,
  "4x": 4,
  "8x": 8,
  "16x": 16,
};

export const getClickOptionsFromPreset = (
  preset: ClickPreset
): { interval: number; holdTime: number } => {
  const multiplier = PRESET_MULTIPLIERS[preset];
  return {
    interval: Math.round(backendConfig.click.interval / multiplier),
    holdTime: Math.round(backendConfig.click.holdTime / multiplier),
  };
};

export const getDragOptionsFromPreset = (
  preset: ClickPreset,
  instant = false
): { interval: number; holdTime: number; instant: boolean } => {
  const { interval, holdTime } = getClickOptionsFromPreset(preset);
  return { interval, holdTime, instant };
};
