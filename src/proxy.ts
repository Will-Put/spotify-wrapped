import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAMES, type SessionCookieValue } from "@/lib/auth";

// Spotify's token endpoint — same URL the OAuth callback uses. Refresh
// uses grant_type=refresh_token (PKCE-style: client_id, no client_secret).
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
// Refresh this many ms before the access token actually expires, so a
// request that arrives right at the boundary still gets a fresh token.
const REFRESH_BUFFER_MS = 60_000;

// Same cookie attributes as the OAuth callback (src/app/api/auth/callback/route.ts).
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
} as const;

/**
 * Token-refresh proxy (Next.js 16's renamed middleware). Runs on the
 * Node.js runtime for every request matching `config.matcher`.
 *
 * Every branch continues the request (`NextResponse.next()`) — the proxy
 * never blocks the user. The cookie is only cleared on a definitive
 * "refresh token is dead" signal (400/401 from Spotify, or a malformed
 * cookie). Transient failures keep the existing cookie so a brief Spotify
 * hiccup doesn't log anyone out.
 *
 * IMPORTANT — same-request propagation: when we refresh (or clear) the
 * cookie we write it to BOTH the request and the response. Writing only to
 * the response sets a Set-Cookie header for the *browser's next* request,
 * but the page rendering on THIS request reads the *incoming* request
 * cookies (via `cookies()` in a Server Component) — which would still hold
 * the stale token. Mutating `request.cookies` and forwarding the request
 * via `next({ request })` is what makes the current render see the fresh
 * token, so the refresh is truly silent (no "session expired" flicker).
 */
export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAMES.session);
  if (!cookie) return NextResponse.next();

  let session: SessionCookieValue;
  try {
    session = JSON.parse(cookie.value);
    if (
      typeof session.refreshToken !== "string" ||
      typeof session.expiresAt !== "number"
    ) {
      return clearSession(request);
    }
  } catch {
    return clearSession(request);
  }

  // Fast path: token still has more than REFRESH_BUFFER_MS of life left.
  if (session.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return NextResponse.next();
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return NextResponse.next();

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
    return NextResponse.next();
  }

  // Definitive "refresh token is dead" — clear cookie, page goes anonymous.
  if (tokenResponse.status === 400 || tokenResponse.status === 401) {
    return clearSession(request);
  }
  // Any other non-2xx (5xx, rate limit) — transient, keep the old cookie.
  if (!tokenResponse.ok) return NextResponse.next();

  let tokens: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  try {
    tokens = await tokenResponse.json();
  } catch {
    return NextResponse.next();
  }

  if (
    typeof tokens.access_token !== "string" ||
    typeof tokens.expires_in !== "number"
  ) {
    return NextResponse.next();
  }

  const newSession: SessionCookieValue = {
    accessToken: tokens.access_token,
    // Spotify sometimes rotates the refresh token, sometimes doesn't.
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
  const value = JSON.stringify(newSession);

  // (1) Update the request so THIS render reads the fresh token.
  request.cookies.set(COOKIE_NAMES.session, value);
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  // (2) Persist to the browser for future requests.
  response.cookies.set(COOKIE_NAMES.session, value, SESSION_COOKIE_OPTIONS);
  return response;
}

/**
 * Drop the session from BOTH the in-flight request (so the page renders the
 * anonymous state on this same request) and the browser (so it's gone next
 * time). See the same-request propagation note on `proxy` above.
 */
function clearSession(request: NextRequest) {
  request.cookies.delete(COOKIE_NAMES.session);
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.cookies.delete(COOKIE_NAMES.session);
  return response;
}

// Only run on the home page for PR 4. PR 5+ will widen this matcher as
// more routes need fresh auth. Do NOT add a `runtime` key — proxy is
// Node.js-only in Next 16 and setting `runtime` throws at build time.
export const config = { matcher: ["/"] };
