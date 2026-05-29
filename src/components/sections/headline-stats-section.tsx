import {
  loadRecentlyPlayed,
  loadTopArtists,
  loadTopTracks,
} from "@/lib/loaders";
import { HeadlineStats } from "@/components/headline-stats";
import { formatListeningTime, summarizeRecentListening } from "@/lib/listening";
import type { TimeRange } from "@/lib/spotify";

export async function HeadlineStatsSection({
  accessToken,
  timeRange,
}: {
  accessToken: string;
  timeRange: TimeRange;
}) {
  const [artistsResult, tracksResult, recentResult] = await Promise.all([
    loadTopArtists(accessToken, timeRange),
    loadTopTracks(accessToken, timeRange),
    loadRecentlyPlayed(accessToken),
  ]);

  const topArtist = artistsResult.ok
    ? (artistsResult.artists[0]?.name ?? null)
    : null;
  const topTrack = tracksResult.ok
    ? (tracksResult.tracks[0]?.name ?? null)
    : null;

  let recentTimeLabel: string | null = null;
  let recentCount = 0;
  if (recentResult.ok) {
    const summary = summarizeRecentListening(recentResult.items);
    // null when there are plays but no durations, so the card shows "—"
    // rather than a misleading "~0m" (see PR 8).
    recentTimeLabel =
      summary.totalMs > 0 ? formatListeningTime(summary.totalMs) : null;
    recentCount = summary.trackCount;
  }

  return (
    <HeadlineStats
      topArtist={topArtist}
      topTrack={topTrack}
      recentTimeLabel={recentTimeLabel}
      recentCount={recentCount}
    />
  );
}
