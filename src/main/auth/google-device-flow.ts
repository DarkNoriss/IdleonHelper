import { logger } from "../utils/index";

const DEVICE_CODE_URL = "https://oauth2.googleapis.com/device/code";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "email profile";

export type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_url: string;
  verification_url_complete?: string;
  expires_in: number;
  interval: number;
};

export type TokenResponse = {
  id_token: string;
  access_token: string;
  expires_in: number;
};

export class DeviceFlowError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "DeviceFlowError";
    this.code = code;
  }
}

export const requestDeviceCode = async (
  clientId: string
): Promise<DeviceCodeResponse> => {
  const res = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope: SCOPES }),
  });
  if (!res.ok) {
    const body = await res.text();
    logger.error("device-code request failed", res.status, body);
    throw new DeviceFlowError(
      "network",
      `device code request failed (${res.status})`
    );
  }
  return (await res.json()) as DeviceCodeResponse;
};

type PollOptions = {
  clientId: string;
  clientSecret: string;
  deviceCode: string;
  intervalSec: number;
  expiresInSec: number;
  signal: AbortSignal;
};

export const pollForToken = async ({
  clientId,
  clientSecret,
  deviceCode,
  intervalSec,
  expiresInSec,
  signal,
}: PollOptions): Promise<TokenResponse> => {
  const deadline = Date.now() + expiresInSec * 1000;
  let interval = intervalSec;
  while (Date.now() < deadline) {
    if (signal.aborted) {
      throw new DeviceFlowError("aborted", "sign-in cancelled");
    }
    await sleep(interval * 1000, signal);

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    const body = (await res.json()) as Record<string, unknown>;

    if (res.ok && typeof body.id_token === "string") {
      return body as unknown as TokenResponse;
    }
    const err = typeof body.error === "string" ? body.error : "unknown";
    if (err === "authorization_pending") {
      continue;
    }
    if (err === "slow_down") {
      interval += 5;
      continue;
    }
    if (err === "access_denied") {
      throw new DeviceFlowError("access_denied", "sign-in cancelled");
    }
    if (err === "expired_token") {
      throw new DeviceFlowError(
        "expired_token",
        "sign-in timed out - try again"
      );
    }
    logger.error("device-code poll error", err, body);
    throw new DeviceFlowError(err, `sign-in failed: ${err}`);
  }
  throw new DeviceFlowError("expired_token", "sign-in timed out - try again");
};

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DeviceFlowError("aborted", "sign-in cancelled"));
      },
      { once: true }
    );
  });
