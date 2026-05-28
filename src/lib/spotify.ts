import { cookies } from "next/headers";
import { COOKIE_NAMES, type SessionCookieValue } from "@/lib/auth";

const SPOTIFY_API = "https://api.spotify.com/v1";

/**
 * Read and parse the spotify_session cookie. Returns null if missing,
 * malformed, or missing required fields. Caller should treat null as
 * "user is not logged in."
 */
export async function getSession(): Promise<SessionCookieValue | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAMES.session);
  if (!sessionCookie) return null;

  let session: unknown;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }

  if (
    typeof session !== "object" ||
    session === null ||
    typeof (session as SessionCookieValue).accessToken !== "string" ||
    typeof (session as SessionCookieValue).refreshToken !== "string" ||
    typeof (session as SessionCookieValue).expiresAt !== "number"
  ) {
    return null;
  }

  return session as SessionCookieValue;
}

export type SpotifyProfile = {
  id: string;
  display_name: string | null;
  email: string;
};

export type GetMeFailureReason = "http" | "network" | "parse";

export type GetMeResult =
  | { ok: true; profile: SpotifyProfile }
  | { ok: false; status: number; reason: GetMeFailureReason };

/**
 * Call Spotify's `/v1/me` with the given access token.
 *
 * Returns a discriminated union so callers can distinguish:
 * - ok: profile usable
 * - reason "http", status 401 → access token expired or revoked
 * - reason "http", status other → Spotify HTTP error (5xx, 429, etc.)
 * - reason "network", status 0 → fetch threw (DNS, connection refused, timeout)
 * - reason "parse", status 200 → response body wasn't valid JSON
 *
 * `cache: "no-store"` because authenticated responses must never be
 * cached at the Next.js fetch layer.
 */
export async function getMe(accessToken: string): Promise<GetMeResult> {
  let response: Response;
  try {
    response = await fetch(`${SPOTIFY_API}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    // Network failure: DNS lookup failed, connection refused, timeout, etc.
    // Returning a structured result (instead of letting fetch throw upstream)
    // lets the home page degrade gracefully rather than 500.
    return { ok: false, status: 0, reason: "network" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, reason: "http" };
  }

  try {
    const profile = (await response.json()) as SpotifyProfile;
    return { ok: true, profile };
  } catch {
    // Spotify returned 200 with a body we couldn't parse as JSON.
    // Vanishingly rare but real (proxy issues, partial response).
    return { ok: false, status: response.status, reason: "parse" };
  }
}
