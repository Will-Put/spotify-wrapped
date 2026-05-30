import { cache } from "react";
import {
  getRecentlyPlayed,
  getTopArtists,
  getTopTracks,
  type SpotifyArtist,
  type TimeRange,
} from "@/lib/spotify";
import {
  computePersonality,
  hasEnoughData,
  type Personality,
} from "@/lib/personality";

// React.cache memoizes per-request by positional (primitive) args, so a
// section and the headline card can both load the same data with exactly one
// Spotify call per render. Keep args primitive — an options object would break
// memoization (new object identity each call) and re-issue the fetch.

export const loadTopTracks = cache(
  (accessToken: string, timeRange: TimeRange) =>
    getTopTracks(accessToken, { limit: 10, timeRange }),
);

export const loadTopArtists = cache(
  (accessToken: string, timeRange: TimeRange) =>
    getTopArtists(accessToken, { limit: 10, timeRange }),
);

// Recently-played is window-independent. Fetch 50 (Spotify's max): the list
// shows the first 10, the headline "Lately" stat summarizes all 50.
export const loadRecentlyPlayed = cache((accessToken: string) =>
  getRecentlyPlayed(accessToken, { limit: 50 }),
);

export type PersonalityLoad =
  | { ok: false }
  | { ok: true; enough: false }
  | {
      ok: true;
      enough: true;
      personality: Personality;
      topArtists: SpotifyArtist[];
    };

// Personality is window-independent: explorer score from all-time top tracks,
// evolving score from recent-vs-all-time top artists. Three Spotify calls,
// memoized per request by the (primitive) access token.
export const loadPersonality = cache(
  async (accessToken: string): Promise<PersonalityLoad> => {
    const [tracksRes, shortRes, longRes] = await Promise.all([
      getTopTracks(accessToken, { limit: 50, timeRange: "long_term" }),
      getTopArtists(accessToken, { limit: 50, timeRange: "short_term" }),
      getTopArtists(accessToken, { limit: 50, timeRange: "long_term" }),
    ]);
    if (!tracksRes.ok || !shortRes.ok || !longRes.ok) return { ok: false };

    const { tracks } = tracksRes;
    const shortArtists = shortRes.artists;
    const longArtists = longRes.artists;

    if (!hasEnoughData(tracks, shortArtists, longArtists)) {
      return { ok: true, enough: false };
    }
    return {
      ok: true,
      enough: true,
      personality: computePersonality(tracks, shortArtists, longArtists),
      topArtists: longArtists.slice(0, 3),
    };
  },
);
