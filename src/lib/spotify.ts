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

export type SpotifyApiFailureReason = "http" | "network" | "parse";

export type TimeRange = "short_term" | "medium_term" | "long_term";

const TIME_RANGES: readonly TimeRange[] = [
  "short_term",
  "medium_term",
  "long_term",
];

/** Coerce an untrusted URL value to a valid window; default to short_term. */
export function parseTimeRange(value: string | undefined): TimeRange {
  return TIME_RANGES.includes(value as TimeRange)
    ? (value as TimeRange)
    : "short_term";
}

export type GetMeResult =
  | { ok: true; profile: SpotifyProfile }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
};

export type GetTopTracksResult =
  | { ok: true; tracks: SpotifyTrack[] }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };

export type SpotifyArtist = {
  id: string;
  name: string;
  // `genres` and `images` are documented as always-present, but the live API
  // omits them for some artists — keep them optional and access defensively.
  genres?: string[];
  images?: { url: string; height: number; width: number }[];
};

export type GetTopArtistsResult =
  | { ok: true; artists: SpotifyArtist[] }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };

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

type TopTracksOptions = {
  limit?: number;
  timeRange?: TimeRange;
};

/**
 * Call Spotify's `/v1/me/top/tracks` with the given access token.
 *
 * Defaults to the last-4-weeks window (`short_term`) and 10 tracks.
 * PR 5 will pass `timeRange` to switch windows. Same discriminated-union
 * return shape as `getMe` so callers handle failures identically.
 */
export async function getTopTracks(
  accessToken: string,
  options: TopTracksOptions = {},
): Promise<GetTopTracksResult> {
  const { limit = 10, timeRange = "short_term" } = options;
  const url = `${SPOTIFY_API}/me/top/tracks?time_range=${timeRange}&limit=${limit}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, reason: "network" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, reason: "http" };
  }

  try {
    const data = (await response.json()) as { items?: SpotifyTrack[] };
    // A 200 with a missing/non-array `items` is a broken shape — treat it
    // like a parse failure so the page degrades to spotify-down instead of
    // crashing on `tracks.length` downstream.
    if (!Array.isArray(data.items)) {
      return { ok: false, status: response.status, reason: "parse" };
    }
    return { ok: true, tracks: data.items };
  } catch {
    return { ok: false, status: response.status, reason: "parse" };
  }
}

type TopArtistsOptions = {
  limit?: number;
  timeRange?: TimeRange;
};

/**
 * Call Spotify's `/v1/me/top/artists` with the given access token.
 *
 * Mirrors `getTopTracks` exactly — same options, same discriminated-union
 * return shape, same Array.isArray guard so a malformed 200 degrades to
 * spotify-down instead of crashing downstream.
 */
export async function getTopArtists(
  accessToken: string,
  options: TopArtistsOptions = {},
): Promise<GetTopArtistsResult> {
  const { limit = 10, timeRange = "short_term" } = options;
  const url = `${SPOTIFY_API}/me/top/artists?time_range=${timeRange}&limit=${limit}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, reason: "network" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, reason: "http" };
  }

  try {
    const data = (await response.json()) as { items?: SpotifyArtist[] };
    if (!Array.isArray(data.items)) {
      return { ok: false, status: response.status, reason: "parse" };
    }
    return { ok: true, artists: data.items };
  } catch {
    return { ok: false, status: response.status, reason: "parse" };
  }
}

export type RecentlyPlayedItem = {
  track: SpotifyTrack;
  playedAt: string; // ISO 8601, from the API's `played_at`
};

export type GetRecentlyPlayedResult =
  | { ok: true; items: RecentlyPlayedItem[] }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };

type RecentlyPlayedOptions = { limit?: number };

/**
 * Call Spotify's `/v1/me/player/recently-played`. Same discriminated-union
 * shape as the other helpers. Maps the API's `played_at` → `playedAt`.
 */
export async function getRecentlyPlayed(
  accessToken: string,
  options: RecentlyPlayedOptions = {},
): Promise<GetRecentlyPlayedResult> {
  const { limit = 10 } = options;
  const url = `${SPOTIFY_API}/me/player/recently-played?limit=${limit}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, reason: "network" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, reason: "http" };
  }

  try {
    const data = (await response.json()) as {
      items?: { track: SpotifyTrack; played_at: string }[];
    };
    if (!Array.isArray(data.items)) {
      return { ok: false, status: response.status, reason: "parse" };
    }
    const items = data.items.map((it) => ({
      track: it.track,
      playedAt: it.played_at,
    }));
    return { ok: true, items };
  } catch {
    return { ok: false, status: response.status, reason: "parse" };
  }
}

export type NowPlayingResult =
  | { playing: false }
  | { playing: true; track: SpotifyTrack };

/**
 * Call Spotify's `/v1/me/player/currently-playing`. Non-critical widget —
 * every failure (204 nothing playing, paused, podcast/ad, network, 401, 5xx)
 * resolves to `{ playing: false }` so the indicator simply hides.
 */
export async function getNowPlaying(
  accessToken: string,
): Promise<NowPlayingResult> {
  let response: Response;
  try {
    response = await fetch(`${SPOTIFY_API}/me/player/currently-playing`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { playing: false };
  }

  // 204 = nothing playing (success, NOT an error). Any non-2xx → hide.
  if (response.status === 204 || !response.ok) {
    return { playing: false };
  }

  try {
    const data = (await response.json()) as {
      is_playing?: boolean;
      currently_playing_type?: string;
      item?: SpotifyTrack | null;
    };
    // Only show actively-playing *tracks* (not paused, not podcasts/ads).
    if (
      !data.is_playing ||
      data.currently_playing_type !== "track" ||
      !data.item
    ) {
      return { playing: false };
    }
    return { playing: true, track: data.item };
  } catch {
    return { playing: false };
  }
}
