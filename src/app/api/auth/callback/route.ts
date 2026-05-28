import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES, type PkceCookieValue } from "@/lib/auth";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new NextResponse(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI env var.",
      { status: 500 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Spotify returned an error (e.g., user denied consent)
  if (error) {
    return new NextResponse(`Spotify rejected the request: ${error}`, {
      status: 400,
    });
  }

  if (!code || !state) {
    return new NextResponse("Missing code or state in callback.", {
      status: 400,
    });
  }

  const cookieStore = await cookies();
  const pkceCookie = cookieStore.get(COOKIE_NAMES.pkce);
  if (!pkceCookie) {
    return new NextResponse(
      "PKCE cookie missing — flow may have expired. Try logging in again.",
      { status: 400 },
    );
  }

  let pkce: PkceCookieValue;
  try {
    pkce = JSON.parse(pkceCookie.value);
  } catch {
    return new NextResponse("PKCE cookie malformed.", { status: 400 });
  }

  // CSRF check — the state we generated at /login MUST match what
  // Spotify echoed back. If not, this callback didn't originate from
  // a flow we started.
  if (pkce.state !== state) {
    return new NextResponse("State mismatch — possible CSRF attempt.", {
      status: 400,
    });
  }

  // Exchange the authorization code for tokens (PKCE-only — no
  // client_secret in body, no Basic auth header).
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: pkce.codeVerifier,
  });

  const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    return new NextResponse(
      `Token exchange failed (${tokenResponse.status}): ${errorText}`,
      { status: 500 },
    );
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };

  cookieStore.set(
    COOKIE_NAMES.session,
    JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  );

  cookieStore.delete(COOKIE_NAMES.pkce);

  return NextResponse.redirect(new URL("/", request.url));
}
