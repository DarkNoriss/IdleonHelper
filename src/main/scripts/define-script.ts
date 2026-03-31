import { backendCommand } from "../backend";
import { cancellationManager, logger } from "../utils";
import type { CancellationToken } from "../utils/cancellation-token";

export type ScriptContext<TArgs extends unknown[] = []> = {
  token: CancellationToken;
  backend: typeof backendCommand;
  logger: typeof logger;
  args: TArgs;
};

export type ScriptConfig<TArgs extends unknown[] = [], TResult = void> = {
  id: string;
  name: string;
  run: (context: ScriptContext<TArgs>) => Promise<TResult>;
};

export type ScriptDescriptor = {
  id: string;
  name: string;
  execute: (...args: unknown[]) => Promise<unknown>;
};

export const defineScript = <TArgs extends unknown[] = [], TResult = void>(
  config: ScriptConfig<TArgs, TResult>
): ScriptDescriptor => {
  const execute = async (...args: unknown[]): Promise<TResult> => {
    if (cancellationManager.getStatus().isWorking) {
      throw new Error("Another operation is already running");
    }

    logger.log(`Starting script: ${config.name}`);
    const token = cancellationManager.createToken();

    try {
      const result = await config.run({
        token,
        backend: backendCommand,
        logger,
        args: args as unknown as TArgs,
      });
      logger.log(`Script completed: ${config.name}`);
      return result;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Operation was cancelled"
      ) {
        logger.log(`Script cancelled: ${config.name}`);
        return undefined as TResult;
      }
      throw error;
    } finally {
      cancellationManager.clearToken();
    }
  };

  return {
    id: config.id,
    name: config.name,
    execute,
  };
};
