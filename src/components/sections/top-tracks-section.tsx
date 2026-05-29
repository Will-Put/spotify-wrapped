import { loadTopTracks } from "@/lib/loaders";
import { TopTracks } from "@/components/top-tracks";
import { SectionError } from "@/components/sections/section-ui";
import type { TimeRange } from "@/lib/spotify";

export async function TopTracksSection({
  accessToken,
  timeRange,
}: {
  accessToken: string;
  timeRange: TimeRange;
}) {
  const result = await loadTopTracks(accessToken, timeRange);
  if (!result.ok) return <SectionError title="Top tracks" />;
  return <TopTracks tracks={result.tracks} />;
}
