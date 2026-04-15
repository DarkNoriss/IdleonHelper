import type { CancellationToken } from "../utils/cancellation-token";

export type ScriptContext<TArgs extends unknown[] = []> = {
  token: CancellationToken;
  args: TArgs;
};

export type ScriptRecurringConfig<TArgs extends unknown[]> = {
  intervalFromArgs: (args: TArgs) => number;
};

export type ScriptConfig<TArgs extends unknown[] = [], TResult = void> = {
  id: string;
  name: string;
  recurring?: ScriptRecurringConfig<TArgs>;
  run: (context: ScriptContext<TArgs>) => Promise<TResult>;
};

export type ScriptDescriptor = {
  id: string;
  name: string;
  recurring: boolean;
  intervalFromArgs?: (args: unknown[]) => number;
  run: (context: ScriptContext<unknown[]>) => Promise<unknown>;
};

export const defineScript = <TArgs extends unknown[] = [], TResult = void>(
  config: ScriptConfig<TArgs, TResult>
): ScriptDescriptor => ({
  id: config.id,
  name: config.name,
  recurring: Boolean(config.recurring),
  intervalFromArgs: config.recurring
    ? (args) => config.recurring!.intervalFromArgs(args as TArgs)
    : undefined,
  run: (context) =>
    config.run({
      token: context.token,
      args: context.args as TArgs,
    }),
});
