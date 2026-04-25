import { BrowserWindow, ipcMain } from "electron";
import { logger } from "../utils/index";
import {
  DeviceFlowError,
  pollForToken,
  requestDeviceCode,
} from "./google-device-flow";
import {
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
} from "./oauth-config";

let inflight: AbortController | null = null;

const broadcast = (channel: string, payload: unknown) => {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
};

export const registerAuthHandlers = (): void => {
  ipcMain.handle("auth:signIn", async () => {
    if (inflight) {
      logger.warn("auth:signIn called while another flow is in progress");
      inflight.abort();
    }
    inflight = new AbortController();
    const signal = inflight.signal;

    try {
      const dc = await requestDeviceCode(GOOGLE_OAUTH_CLIENT_ID);
      broadcast("auth:awaiting-consent", {
        userCode: dc.user_code,
        verificationUrl: dc.verification_url,
        expiresAt: Date.now() + dc.expires_in * 1000,
      });
      const token = await pollForToken({
        clientId: GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
        deviceCode: dc.device_code,
        intervalSec: dc.interval,
        expiresInSec: dc.expires_in,
        signal,
      });
      logger.log("auth:signIn success");
      return { ok: true as const, idToken: token.id_token };
    } catch (err) {
      const code = err instanceof DeviceFlowError ? err.code : "unknown";
      const message = err instanceof Error ? err.message : "sign-in failed";
      logger.error("auth:signIn failed", code, message);
      return { ok: false as const, code, message };
    } finally {
      inflight = null;
    }
  });

  ipcMain.handle("auth:cancel", () => {
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
    return { ok: true as const };
  });
};
