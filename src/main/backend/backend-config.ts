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
    interval: 260,
    holdTime: 80,
  },
  drag: {
    stepSize: 6,
    stepDelay: 1,
  },
} as const
