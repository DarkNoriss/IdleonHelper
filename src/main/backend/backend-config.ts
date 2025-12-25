export const backendConfig = {
  find: {
    timeoutMs: 5000,
    intervalMs: 50,
    threshold: 0.925,
  },
  isVisible: {
    timeoutMs: 100,
  },
  click: {
    times: 1,
    interval: 250,
    holdTime: 100,
  },
  drag: {
    stepSize: 3,
    stepDelay: 2,
  },
} as const
