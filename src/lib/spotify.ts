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

export type GetMeResult =
  | { ok: true; profile: SpotifyProfile }
  | { ok: false; status: number };

/**
 * Call Spotify's `/v1/me` with the given access token.
 *
 * - 200 → returns the user's profile
 * - 401 → access token expired or revoked (caller should show "session expired")
 * - other non-2xx → returns the status so caller can decide what to do
 *
 * `cache: "no-store"` because authenticated responses must never be
 * cached at the Next.js fetch layer.
 */
export async function getMe(accessToken: string): Promise<GetMeResult> {
  const response = await fetch(`${SPOTIFY_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const profile = (await response.json()) as SpotifyProfile;
  return { ok: true, profile };
}
