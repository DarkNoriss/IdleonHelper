import { create } from "zustand";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "awaiting-consent"
  | "connected"
  | "reconnecting"
  | "error";

type ConnectionState = {
  status: ConnectionStatus;
  email: string | null;
  displayName: string | null;
  userCode: string | null;
  verificationUrl: string | null;
  lastUpdated: number | null;
  lastError: string | null;
  isStale: boolean;
  consecutiveErrors: number;

  setStatus: (s: ConnectionStatus) => void;
  setIdentity: (id: {
    email: string | null;
    displayName: string | null;
  }) => void;
  setConsent: (c: { userCode: string; verificationUrl: string }) => void;
  clearConsent: () => void;
  setLastUpdated: (ms: number | null) => void;
  setStale: (s: boolean) => void;
  setError: (msg: string | null) => void;
  bumpError: () => void;
  resetErrors: () => void;
  reset: () => void;
};

const initialState = {
  status: "idle" as ConnectionStatus,
  email: null,
  displayName: null,
  userCode: null,
  verificationUrl: null,
  lastUpdated: null,
  lastError: null,
  isStale: false,
  consecutiveErrors: 0,
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setIdentity: ({ email, displayName }) => set({ email, displayName }),
  setConsent: ({ userCode, verificationUrl }) =>
    set({ userCode, verificationUrl, status: "awaiting-consent" }),
  clearConsent: () => set({ userCode: null, verificationUrl: null }),
  setLastUpdated: (lastUpdated) => set({ lastUpdated }),
  setStale: (isStale) => set({ isStale }),
  setError: (lastError) => set({ lastError }),
  bumpError: () => set((s) => ({ consecutiveErrors: s.consecutiveErrors + 1 })),
  resetErrors: () => set({ consecutiveErrors: 0 }),
  reset: () => set(initialState),
}));

// ─── Selector hooks ──────────────────────────────────────────────
export const useIsSignedIn = () =>
  useConnectionStore((s) => s.status === "connected");

export const useDisabledReason = (): string | null =>
  useConnectionStore((s) =>
    s.status === "connected"
      ? null
      : "sign in with google to sync game data from firebase"
  );

export const useLastUpdatedMsAgo = (): number | null =>
  useConnectionStore((s) =>
    s.lastUpdated == null ? null : Date.now() - s.lastUpdated
  );
