import { loadRecentlyPlayed } from "@/lib/loaders";
import { RecentlyPlayed } from "@/components/recently-played";
import { SectionError } from "@/components/sections/section-ui";

export async function RecentlyPlayedSection({
  accessToken,
}: {
  accessToken: string;
}) {
  const result = await loadRecentlyPlayed(accessToken);
  if (!result.ok) return <SectionError title="Recently played" />;
  return <RecentlyPlayed items={result.items.slice(0, 10)} />;
}
