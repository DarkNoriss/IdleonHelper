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
    interval: 200,
    holdTime: 50,
  },
  drag: {
    stepSize: 3,
    stepDelay: 2,
  },
} as const
