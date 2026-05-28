import { createHash, randomBytes } from "node:crypto";

export const COOKIE_NAMES = {
  session: "spotify_session",
  pkce: "oauth_pkce",
} as const;

/**
 * All scopes we'll ever need across PRs 3-10, requested upfront so
 * existing logged-in users never get bounced back to re-consent.
 */
export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
  "user-read-currently-playing",
  "user-read-playback-state",
] as const;

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";

/**
 * Generate a cryptographically random URL-safe string suitable for
 * use as an OAuth `state` parameter or a PKCE `code_verifier`.
 *
 * PKCE `code_verifier` must be 43-128 chars from the URL-safe alphabet
 * [A-Za-z0-9-._~] per RFC 7636. base64url encoding satisfies this.
 *
 * @param byteLength Raw byte length before base64url encoding.
 *                   32 bytes → 43 chars (minimum); 64 bytes → 86 chars.
 */
export function generateRandomString(byteLength: number = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/**
 * Compute the SHA-256 hash of a code_verifier and base64url-encode it
 * for use as a PKCE `code_challenge`. The matching `code_challenge_method`
 * is always `S256` (this is the only method Spotify accepts).
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Build Spotify's `accounts.spotify.com/authorize` URL with all the
 * params required to start an Authorization Code + PKCE flow.
 */
export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  return url.toString();
}

export type PkceCookieValue = {
  state: string;
  codeVerifier: string;
};

export type SessionCookieValue = {
  accessToken: string;
  refreshToken: string;
  /** Unix milliseconds at which `accessToken` expires. */
  expiresAt: number;
};
