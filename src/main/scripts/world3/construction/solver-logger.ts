export type SolverLogLevel = "log" | "info" | "warn" | "error";

export type SolverLogger = Record<SolverLogLevel, (message: string) => void>;

const defaultImpl: SolverLogger = {
  log: (m) => console.log(m),
  info: (m) => console.info(m),
  warn: (m) => console.warn(m),
  error: (m) => console.error(m),
};

let impl: SolverLogger = defaultImpl;

export const setSolverLogger = (logger: SolverLogger): void => {
  impl = logger;
};

export const solverLogger: SolverLogger = {
  log: (m) => impl.log(m),
  info: (m) => impl.info(m),
  warn: (m) => impl.warn(m),
  error: (m) => impl.error(m),
};
