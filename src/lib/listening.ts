import type { RecentlyPlayedItem } from "@/lib/spotify";

export type RecentListeningSummary = {
  totalMs: number;
  trackCount: number;
};

/**
 * Sum the durations and count the plays in a recently-played list.
 * Pure — no I/O. A track missing `duration_ms` contributes 0 but is
 * still counted, so the count stays an honest play count.
 */
export function summarizeRecentListening(
  items: RecentlyPlayedItem[],
): RecentListeningSummary {
  let totalMs = 0;
  for (const item of items) {
    totalMs += item.track.duration_ms ?? 0;
  }
  return { totalMs, trackCount: items.length };
}

/**
 * Format a millisecond total as an approximate human duration, e.g.
 * "~3h 12m" or "~12m". The leading "~" signals this is an estimate from
 * a capped recent-plays sample, not an exact all-time figure.
 */
export function formatListeningTime(totalMs: number): string {
  const totalMinutes = Math.round(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `~${hours}h ${minutes}m`;
  return `~${minutes}m`;
}
