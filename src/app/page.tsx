import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { HeadlineStats } from "@/components/headline-stats";
import { NowPlaying } from "@/components/now-playing";
import { RecentlyPlayed } from "@/components/recently-played";
import { TimeRangeToggle } from "@/components/time-range-toggle";
import { TopArtists } from "@/components/top-artists";
import { TopTracks } from "@/components/top-tracks";
import {
  getMe,
  getRecentlyPlayed,
  getSession,
  getTopArtists,
  getTopTracks,
  parseTimeRange,
  type RecentlyPlayedItem,
  type SpotifyApiFailureReason,
  type SpotifyArtist,
  type SpotifyTrack,
  type TimeRange,
} from "@/lib/spotify";
import {
  formatListeningTime,
  summarizeRecentListening,
} from "@/lib/listening";

type ViewState =
  | { kind: "anonymous" }
  | {
      kind: "logged-in";
      displayName: string;
      timeRange: TimeRange;
      tracks: SpotifyTrack[];
      artists: SpotifyArtist[];
      recentlyPlayed: RecentlyPlayedItem[];
      topArtist: string | null;
      topTrack: string | null;
      recentTimeLabel: string | null;
      recentCount: number;
    }
  | { kind: "expired" }
  | { kind: "spotify-down" };

// Map a failed Spotify result to the right view state.
// 401 → expired (re-login fixes it); anything else → spotify-down (transient).
function failureState(result: {
  ok: false;
  status: number;
  reason: SpotifyApiFailureReason;
}): Extract<ViewState, { kind: "expired" | "spotify-down" }> {
  if (result.reason === "http" && result.status === 401) {
    return { kind: "expired" };
  }
  return { kind: "spotify-down" };
}

async function resolveViewState(timeRange: TimeRange): Promise<ViewState> {
  const session = await getSession();
  if (!session) return { kind: "anonymous" };

  // Fetch profile + tracks + artists in parallel for the chosen window.
  const [meResult, tracksResult, artistsResult, recentResult] =
    await Promise.all([
      getMe(session.accessToken),
      getTopTracks(session.accessToken, { limit: 10, timeRange }),
      getTopArtists(session.accessToken, { limit: 10, timeRange }),
      getRecentlyPlayed(session.accessToken, { limit: 50 }),
    ]);

  // Each check narrows the result to ok:true for the success branch below.
  if (!meResult.ok) return failureState(meResult);
  if (!tracksResult.ok) return failureState(tracksResult);
  if (!artistsResult.ok) return failureState(artistsResult);
  if (!recentResult.ok) return failureState(recentResult);

  const recentSummary = summarizeRecentListening(recentResult.items);

  return {
    kind: "logged-in",
    // display_name can be null (rare). Fall back to the user's Spotify ID.
    displayName: meResult.profile.display_name ?? meResult.profile.id,
    timeRange,
    tracks: tracksResult.tracks,
    artists: artistsResult.artists,
    // KPI "Lately" uses all 50; the list below shows only the first 10.
    recentlyPlayed: recentResult.items.slice(0, 10),
    topArtist: artistsResult.artists[0]?.name ?? null,
    topTrack: tracksResult.tracks[0]?.name ?? null,
    // null when we have plays but no durations (totalMs === 0), so the card
    // shows "—" rather than a misleading "~0m" next to a real play count.
    recentTimeLabel:
      recentSummary.totalMs > 0
        ? formatListeningTime(recentSummary.totalMs)
        : null,
    recentCount: recentSummary.trackCount,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const view = await resolveViewState(parseTimeRange(range));

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-2xl leading-snug font-medium">
            Spotify Wrapped
          </h1>
          {view.kind === "anonymous" && (
            <CardDescription>Your listening, your year.</CardDescription>
          )}
          {view.kind === "logged-in" && (
            <CardDescription>
              Logged in as <strong>{view.displayName}</strong>
            </CardDescription>
          )}
          {view.kind === "expired" && (
            <CardDescription>Your session expired.</CardDescription>
          )}
          {view.kind === "spotify-down" && (
            <CardDescription>
              Spotify is having trouble right now. Try again in a moment.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {view.kind === "logged-in" && (
            <>
              <NowPlaying />
              <TimeRangeToggle current={view.timeRange} />
              <HeadlineStats
                topArtist={view.topArtist}
                topTrack={view.topTrack}
                recentTimeLabel={view.recentTimeLabel}
                recentCount={view.recentCount}
              />
              <TopTracks tracks={view.tracks} />
              <TopArtists artists={view.artists} />
              <RecentlyPlayed items={view.recentlyPlayed} />
            </>
          )}
          {view.kind === "logged-in" ? <LogoutButton /> : <LoginButton />}
        </CardContent>
      </Card>
    </main>
  );
}
