import { cache } from "react";
import {
  getRecentlyPlayed,
  getTopArtists,
  getTopTracks,
  type TimeRange,
} from "@/lib/spotify";

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
