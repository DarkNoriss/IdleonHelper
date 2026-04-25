// Same Google OAuth client used by IdleonToolbox - the only client trusted by
// the idlemmo Firebase project's Google sign-in provider, configured for the
// device-code flow. Mirrored from IdleonToolbox services/auth/google.js.
export const GOOGLE_OAUTH_CLIENT_ID =
  "267901585099-u6fjd75v6k9gefq7bcokcndv99riir5j";

// Required by Google for the device-code token-exchange step. Per OAuth2 spec
// for installed apps, this "secret" is bundled - the actual secrecy is
// enforced via the OAuth consent flow, not by hiding this value.
export const GOOGLE_OAUTH_CLIENT_SECRET = "HzoZF-UKUNfFwBuz4vafwsaR";
