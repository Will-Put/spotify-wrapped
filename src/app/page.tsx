import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { NowPlaying } from "@/components/now-playing";
import { TimeRangeToggle } from "@/components/time-range-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeadlineStatsSection } from "@/components/sections/headline-stats-section";
import { TopTracksSection } from "@/components/sections/top-tracks-section";
import { TopArtistsSection } from "@/components/sections/top-artists-section";
import { RecentlyPlayedSection } from "@/components/sections/recently-played-section";
import {
  HeadlineStatsSkeleton,
  ListSkeleton,
} from "@/components/sections/section-ui";
import { getMe, getSession, parseTimeRange } from "@/lib/spotify";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const timeRange = parseTimeRange(range);
  const session = await getSession();

  // Default (anonymous) state.
  let description = (
    <CardDescription>Your listening, your year.</CardDescription>
  );
  let body = <LoginButton />;

  if (session) {
    // One fast profile call decides the global state and the header greeting.
    // The heavy sections below stream independently.
    const me = await getMe(session.accessToken);
    if (!me.ok) {
      // 401 → expired (re-login fixes it); anything else → transient Spotify error.
      description =
        me.reason === "http" && me.status === 401 ? (
          <CardDescription>Your session expired.</CardDescription>
        ) : (
          <CardDescription>
            Spotify is having trouble right now. Try again in a moment.
          </CardDescription>
        );
      body = <LoginButton />;
    } else {
      const token = session.accessToken;
      const displayName = me.profile.display_name ?? me.profile.id;
      description = (
        <CardDescription>
          Logged in as <strong>{displayName}</strong>
        </CardDescription>
      );
      body = (
        <>
          <NowPlaying />
          <TimeRangeToggle current={timeRange} />
          <Suspense fallback={<HeadlineStatsSkeleton />}>
            <HeadlineStatsSection accessToken={token} timeRange={timeRange} />
          </Suspense>
          <Suspense fallback={<ListSkeleton title="Top tracks" />}>
            <TopTracksSection accessToken={token} timeRange={timeRange} />
          </Suspense>
          <Suspense fallback={<ListSkeleton title="Top artists" />}>
            <TopArtistsSection accessToken={token} timeRange={timeRange} />
          </Suspense>
          <Suspense fallback={<ListSkeleton title="Recently played" />}>
            <RecentlyPlayedSection accessToken={token} />
          </Suspense>
          <LogoutButton />
        </>
      );
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h1 className="font-heading text-2xl leading-snug font-medium">
                Spotify Wrapped
              </h1>
              {description}
            </div>
            <ThemeToggle />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">{body}</CardContent>
      </Card>
    </main>
  );
}
