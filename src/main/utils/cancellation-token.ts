export type CancellationToken = {
  isCancelled: () => boolean;
  cancel: () => void;
  throwIfCancelled: () => void;
};

export const createCancellationToken = (): CancellationToken => {
  let cancelled = false;
  return {
    isCancelled: () => cancelled,
    cancel: () => {
      cancelled = true;
    },
    throwIfCancelled: () => {
      if (cancelled) {
        throw new Error("Operation was cancelled");
      }
    },
  };
};

export const delay = async (
  milliseconds: number,
  token: CancellationToken
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (checkIntervalId) {
        clearInterval(checkIntervalId);
      }
      if (token.isCancelled()) {
        reject(new Error("Operation was cancelled"));
      } else {
        resolve();
      }
    }, milliseconds);

    const checkIntervalId = setInterval(() => {
      if (token.isCancelled()) {
        clearTimeout(timeoutId);
        clearInterval(checkIntervalId);
        reject(new Error("Operation was cancelled"));
      }
    }, 100);
  });
};
