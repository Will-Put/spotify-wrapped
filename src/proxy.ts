import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAMES, type SessionCookieValue } from "@/lib/auth";

// Spotify's token endpoint — same URL the OAuth callback uses. Refresh
// uses grant_type=refresh_token (PKCE-style: client_id, no client_secret).
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
// Refresh this many ms before the access token actually expires, so a
// request that arrives right at the boundary still gets a fresh token.
const REFRESH_BUFFER_MS = 60_000;

/**
 * Token-refresh proxy (Next.js 16's renamed middleware). Runs on the
 * Node.js runtime for every request matching `config.matcher`.
 *
 * Every branch returns `NextResponse.next()` (the `response` variable) so
 * the request ALWAYS continues — the proxy never blocks the user. The
 * cookie is only deleted on a definitive "refresh token is dead" signal
 * (400/401 from Spotify, or a malformed cookie). Transient failures keep
 * the existing cookie so a brief Spotify hiccup doesn't log anyone out.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const cookie = request.cookies.get(COOKIE_NAMES.session);
  if (!cookie) return response;

  let session: SessionCookieValue;
  try {
    session = JSON.parse(cookie.value);
    if (
      typeof session.refreshToken !== "string" ||
      typeof session.expiresAt !== "number"
    ) {
      response.cookies.delete(COOKIE_NAMES.session);
      return response;
    }
  } catch {
    response.cookies.delete(COOKIE_NAMES.session);
    return response;
  }

  // Fast path: token still has more than REFRESH_BUFFER_MS of life left.
  if (session.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return response;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return response;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
        client_id: clientId,
      }),
      cache: "no-store",
    });
  } catch {
    // Network error reaching Spotify — keep the old cookie, let the page try.
    return response;
  }

  // Definitive "refresh token is dead" — delete cookie, page goes anonymous.
  if (tokenResponse.status === 400 || tokenResponse.status === 401) {
    response.cookies.delete(COOKIE_NAMES.session);
    return response;
  }
  // Any other non-2xx (5xx, rate limit) — transient, keep the old cookie.
  if (!tokenResponse.ok) return response;

  let tokens: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  try {
    tokens = await tokenResponse.json();
  } catch {
    return response;
  }

  if (
    typeof tokens.access_token !== "string" ||
    typeof tokens.expires_in !== "number"
  ) {
    return response;
  }

  const newSession: SessionCookieValue = {
    accessToken: tokens.access_token,
    // Spotify sometimes rotates the refresh token, sometimes doesn't.
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  // Same cookie attributes as the OAuth callback (src/app/api/auth/callback/route.ts).
  response.cookies.set(COOKIE_NAMES.session, JSON.stringify(newSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

// Only run on the home page for PR 4. PR 5+ will widen this matcher as
// more routes need fresh auth. Do NOT add a `runtime` key — proxy is
// Node.js-only in Next 16 and setting `runtime` throws at build time.
export const config = { matcher: ["/"] };
