import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { getMe, getSession } from "@/lib/spotify";

type ViewState =
  | { kind: "anonymous" }
  | { kind: "logged-in"; displayName: string }
  | { kind: "expired" }
  | { kind: "spotify-down" };

async function resolveViewState(): Promise<ViewState> {
  const session = await getSession();
  if (!session) return { kind: "anonymous" };

  const result = await getMe(session.accessToken);
  if (result.ok) {
    return {
      kind: "logged-in",
      // display_name can be null (rare). Fall back to the user's Spotify ID.
      displayName: result.profile.display_name ?? result.profile.id,
    };
  }
  // Token is genuinely bad (revoked, expired, malformed) → user can re-login.
  if (result.reason === "http" && result.status === 401) {
    return { kind: "expired" };
  }
  // Everything else (5xx from Spotify, rate limits, network errors, parse
  // errors) is a transient problem the user can't fix by re-logging in.
  return { kind: "spotify-down" };
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
        <CardContent>
          {view.kind === "logged-in" ? <LogoutButton /> : <LoginButton />}
        </CardContent>
      </Card>
    </main>
  );
}
