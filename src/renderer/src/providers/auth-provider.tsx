import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type Unsubscribe,
} from "firebase/auth";
import { useEffect } from "react";
import { auth } from "@/firebase/client";
import {
  refreshCloudsave as refreshCloudsaveDoc,
  subscribeToCloudsave,
} from "@/firebase/cloudsave-subscription";
import { useConnectionStore } from "@/store/connection";
import { useRawJsonStore } from "@/store/raw-json";

type AuthProviderProps = { children: React.ReactNode };

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Wire onAuthStateChanged -> connection store + cloudsave subscription.
  useEffect(() => {
    let unsubscribeSnapshot: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      const conn = useConnectionStore.getState();
      unsubscribeSnapshot?.();
      unsubscribeSnapshot = null;

      if (user) {
        conn.setIdentity({
          email: user.email,
          displayName: user.displayName ?? user.email?.split("@")[0] ?? "user",
        });
        conn.setStatus("connected");
        conn.clearConsent();
        conn.resetErrors();
        unsubscribeSnapshot = subscribeToCloudsave(user.uid);
      } else {
        conn.setIdentity({ email: null, displayName: null });
        conn.setStatus("idle");
        conn.setLastUpdated(null);
        conn.setStale(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot?.();
    };
  }, []);

  // Listen for "awaiting-consent" pings from main during sign-in.
  useEffect(() => {
    const unsub = window.api.auth.onAwaitingConsent(
      ({ userCode, verificationUrl }) => {
        useConnectionStore.getState().setConsent({ userCode, verificationUrl });
      }
    );
    return unsub;
  }, []);

  return <>{children}</>;
};

// ─── Imperative actions exposed to UI ─────────────────────────────
export const signInWithGoogle = async (): Promise<void> => {
  const conn = useConnectionStore.getState();
  conn.setError(null);
  conn.setStatus("connecting");
  const result = await window.api.auth.signIn();
  if (!result.ok) {
    conn.setStatus(result.code === "access_denied" ? "idle" : "error");
    conn.setError(result.message);
    conn.clearConsent();
    return;
  }
  try {
    const credential = GoogleAuthProvider.credential(result.idToken);
    await signInWithCredential(auth, credential);
    // onAuthStateChanged will flip status to "connected".
  } catch (err) {
    conn.setStatus("error");
    conn.setError(err instanceof Error ? err.message : "sign-in failed");
  } finally {
    conn.clearConsent();
  }
};

export const signOutFromGoogle = async (): Promise<void> => {
  await signOut(auth);
  // Also clear the locally cached raw-json so stale data doesn't linger.
  useRawJsonStore.getState().clearRawJson();
};

export const reopenConsentUrl = (): void => {
  const url = useConnectionStore.getState().verificationUrl;
  if (url) {
    window.open(url, "_blank");
  }
};

export const cancelSignIn = async (): Promise<void> => {
  await window.api.auth.cancel();
  const conn = useConnectionStore.getState();
  conn.setStatus("idle");
  conn.clearConsent();
};

export const refreshCloudsave = async (): Promise<void> => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return;
  }
  await refreshCloudsaveDoc(uid);
};
