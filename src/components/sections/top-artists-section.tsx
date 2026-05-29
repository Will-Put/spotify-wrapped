import { loadTopArtists } from "@/lib/loaders";
import { TopArtists } from "@/components/top-artists";
import { SectionError } from "@/components/sections/section-ui";
import type { TimeRange } from "@/lib/spotify";

export async function TopArtistsSection({
  accessToken,
  timeRange,
}: {
  accessToken: string;
  timeRange: TimeRange;
}) {
  const result = await loadTopArtists(accessToken, timeRange);
  if (!result.ok) return <SectionError title="Top artists" />;
  return <TopArtists artists={result.artists} />;
}
