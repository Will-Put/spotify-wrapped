import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { TopTracks } from "@/components/top-tracks";
import {
  getMe,
  getSession,
  getTopTracks,
  type SpotifyTrack,
} from "@/lib/spotify";

type ViewState =
  | { kind: "anonymous" }
  | { kind: "logged-in"; displayName: string; tracks: SpotifyTrack[] }
  | { kind: "expired" }
  | { kind: "spotify-down" };

async function resolveViewState(): Promise<ViewState> {
  const session = await getSession();
  if (!session) return { kind: "anonymous" };

  // Fetch profile + top tracks in parallel — both need the same token.
  const [meResult, tracksResult] = await Promise.all([
    getMe(session.accessToken),
    getTopTracks(session.accessToken, { limit: 10, timeRange: "short_term" }),
  ]);

  // Strict policy: a definitive 401 means re-login; anything else is
  // transient and routes to spotify-down. First failure wins.
  if (!meResult.ok) {
    if (meResult.reason === "http" && meResult.status === 401) {
      return { kind: "expired" };
    }
    return { kind: "spotify-down" };
  }
  if (!tracksResult.ok) {
    if (tracksResult.reason === "http" && tracksResult.status === 401) {
      return { kind: "expired" };
    }
    return { kind: "spotify-down" };
  }

  return {
    kind: "logged-in",
    // display_name can be null (rare). Fall back to the user's Spotify ID.
    displayName: meResult.profile.display_name ?? meResult.profile.id,
    tracks: tracksResult.tracks,
  };
}

export default async function Home() {
  const view = await resolveViewState();

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
          {view.kind === "logged-in" && <TopTracks tracks={view.tracks} />}
          {view.kind === "logged-in" ? <LogoutButton /> : <LoginButton />}
        </CardContent>
      </Card>
    </main>
  );
}
