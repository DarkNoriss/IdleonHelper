import { AsyncLocalStorage } from "node:async_hooks";

export type RunContextStore = {
  runId: string;
  scriptId: string;
  scriptName: string;
  startedAt: number;
};

export const runContext = new AsyncLocalStorage<RunContextStore>();
