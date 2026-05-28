# PR 4 — First real Spotify data on screen (design)

**Date:** 2026-05-28
**Branch (planned):** `pr-4-real-data`
**Status:** Design approved, ready for implementation plan (to be written in next session)

## Goal

The logged-in state of the home page (`/`) renders the user's **top 10 tracks from the last 4 weeks** — track names, artist names, and album thumbnails fetched live from Spotify's `/v1/me/top/tracks` endpoint. Plus: token refresh stops being deferred — middleware silently refreshes access tokens before they expire so a user can keep using the app past the 1-hour Spotify token lifetime without re-logging in.

This is PR 4 of Phase 2. It builds directly on the OAuth scaffold from PR 3.

## Why this design (one-paragraph summary)

We extend the home page rather than introducing a new `/dashboard` route (simpler mental model, no redirect logic, one page to reason about). The top-tracks display is a numbered list with small album thumbnails — denser than text-only, less screen-hungry than a card grid, closest to Spotify Wrapped's actual visual idiom. Token refresh lives in middleware because Next.js 16 forbids cookie writes from Server Components — middleware runs before the page renders, sees the request, can update cookies on the outgoing response. We roll our own (no server-state library like SWR or TanStack Query) because the data fetch is server-side and those libraries are designed for client-side cache management we don't have.

## In scope

- Top tracks: 10 tracks, `time_range=short_term` (last 4 weeks), with album thumbnails
- Profile section unchanged from PR 3 (display name shown in card description)
- Token refresh middleware on `/` route (matcher tight — PR 5+ will widen)
- New `<TopTracks>` Server Component
- New `getTopTracks(accessToken, options)` helper in `lib/spotify.ts`
- Strict error policy: any API failure → existing `spotify-down` state (no per-section fallbacks)
- Empty state copy: "No top tracks yet. Listen to some music on Spotify and come back in a few days."
- Manual verification via Claude in Chrome MCP

## Out of scope (deferred)

- **Time-window toggle** (4 weeks / 6 months / all time) → PR 5
- **Top artists** → PR 5
- **Recently played / now playing** → PR 6
- **Genre breakdown** → PR 7
- **KPI cards / aggregate stats** → PR 8
- **Suspense / skeleton UI for loading flash** → PR 9
- **Per-section error fallbacks** (profile shows, tracks gracefully fail) → PR 9
- **Next.js `<Image>` component with Spotify CDN whitelisting** → PR 9
- **Profile image / follower count / country / Spotify Premium badge** → PR 8 or 9
- **Card responsive sizing tuning on mobile** → PR 9
- **Automated tests** — manual verification only (consistent with PR 3 pattern; mocking Spotify is high-cost for the value)

## New concept this PR introduces — middleware for token refresh

This is the conceptual new ground in PR 4. Worth explaining for future readers (including Will reading this back in a fresh session).

**The problem:** Spotify access tokens expire after 1 hour. PR 3's home page made one API call (`/v1/me`) and on 401 just rendered "Session expired" — fine when the user only had to re-login once an hour. PR 4 makes multiple API calls per page load (profile + top tracks now; more in PRs 5–9). Letting the session die after an hour mid-Wrapped-viewing would be a bad UX.

**The Next.js constraint:** In the App Router, `cookies().set()` is allowed in **Route Handlers, Server Actions, and Middleware** — NOT in Server Components during render. So the home page (`/page.tsx`, a Server Component) cannot refresh and save a new access token mid-render. Something else has to do the refresh before the home page renders.

**The fix:** A `src/middleware.ts` file that Next.js auto-discovers. Middleware runs on every request matching its `matcher` config, before any page renders. It can read cookies on the incoming request and write cookies on the outgoing response. So:

1. Browser sends `GET /` with `spotify_session` cookie
2. Middleware runs, reads the cookie, checks `expiresAt`
3. If close to expiry, middleware POSTs to Spotify's `/api/token` with `grant_type=refresh_token` and the refresh token, gets new tokens, writes the updated `spotify_session` cookie on the response
4. Middleware calls `NextResponse.next()` — the request continues to the page
5. The home page (Server Component) reads the cookie — now containing a fresh access token — and calls Spotify with confidence

The user perceives nothing — the page loads with fresh data, no logout, no "session expired."

## Architecture

### New files

| Path | Responsibility |
|---|---|
| `src/middleware.ts` | Token refresh interceptor. Reads `spotify_session`, refreshes if `expiresAt` is within 60s of now, writes updated cookie. Matcher: `["/"]` for PR 4. |
| `src/components/top-tracks.tsx` | Server Component. Takes `tracks: SpotifyTrack[]`. Renders numbered list with album thumbnail + track name + artist names. Handles empty array with placeholder copy. |

### Modified files

| Path | Change |
|---|---|
| `src/lib/spotify.ts` | Add `SpotifyTrack` type. Add `GetTopTracksResult` type. Add `getTopTracks(accessToken, options)` helper. Rename `GetMeFailureReason` → `SpotifyApiFailureReason` (now shared). |
| `src/app/page.tsx` | Extend `ViewState` union — `logged-in` carries `tracks: SpotifyTrack[]`. Fetch profile + tracks in parallel via `Promise.all`. Render `<TopTracks>` inside the Card when logged-in. |

### Unchanged but worth noting

- `src/app/api/auth/login/route.ts`, `callback/route.ts`, `logout/route.ts` — no changes
- `src/lib/auth.ts` — no changes
- `src/lib/url.ts` — no changes (middleware uses its own helpers; doesn't import `sameHostUrl`)
- `src/components/auth/login-button.tsx`, `logout-button.tsx` — no changes
- `package.json` env vars, `.env.local`, Vercel env vars — no changes (everything from PR 3 still applies)

## Concrete flow — end-to-end when a logged-in user loads `/`

1. Browser sends `GET /` with `spotify_session` cookie attached
2. **`src/middleware.ts` runs first** (matched by `/`):
   - Reads `spotify_session` cookie. If missing → no-op, call `NextResponse.next()`, request continues
   - Parses JSON. If malformed → delete cookie, call `next()`, request continues
   - Reads `expiresAt`. If `expiresAt > Date.now() + 60_000` (more than 60s of validity remaining) → no-op, call `next()`
   - Otherwise: POST to `https://accounts.spotify.com/api/token` with form-encoded body: `grant_type=refresh_token`, `refresh_token=<refresh_token>`, `client_id=<SPOTIFY_CLIENT_ID>`. PKCE-style, no client_secret
3. **Three branches for the refresh POST:**
   - **200 OK** — new tokens received. Build new session JSON `{ accessToken: <new>, refreshToken: <new ?? old>, expiresAt: Date.now() + expires_in*1000 }`. Write on `response.cookies.set(COOKIE_NAMES.session, ...)` with same attributes as PR 3 (httpOnly, sameSite=lax, path=/, maxAge=30d, secure in prod). Call `next()`, request continues with fresh token in cookie
   - **400/401 `invalid_grant`** — refresh token revoked or invalid. Delete `spotify_session` from response cookies. Call `next()`, request continues. Home page will see no cookie, render anonymous state
   - **Network error / 5xx from Spotify** — transient, can't tell from a refresh failure if Spotify is briefly down or the token is permanently bad. Safer call: let request continue with the existing (probably-expired) cookie. Home page's `getMe()` / `getTopTracks()` will fail with 401, page renders `spotify-down` state
4. **Home page Server Component renders:**
   - `getSession()` reads the (now-refreshed if needed) cookie
   - If no session → anonymous state (login button)
   - If session exists → `Promise.all([getMe(token), getTopTracks(token, { limit: 10, timeRange: "short_term" })])` runs both API calls in parallel
5. **Three outcomes from the parallel fetch:**
   - Both `result.ok === true` → `logged-in` state with `displayName` + `tracks` arrays
   - `getMe` returns `{ ok: false, status: 401, reason: "http" }` AND middleware didn't catch it (race window) → `expired` state
   - Either returns any other failure → `spotify-down` state (existing PR 3 copy: "Spotify is having trouble right now. Try again in a moment.")
6. **Render:** Same Card layout as PR 3. For logged-in state, the Card now contains: heading + display name + `<TopTracks tracks={view.tracks} />` + logout button

## Token refresh middleware — detailed design

**File:** `src/middleware.ts` (project root of `src/`, magic location)

**Exports:**

```typescript
export async function middleware(request: NextRequest): Promise<NextResponse>
export const config = { matcher: ["/"] }
```

The matcher pins middleware to just `/` for now. PR 5+ will add `/dashboard`, `/api/spotify/*` etc. as more routes need fresh auth.

**Runtime:** Default (Edge). Edge is fast (sub-100ms cold start), runs globally, supports `fetch()` + `JSON.parse` + cookies — everything this middleware needs. Do NOT pin to `nodejs` runtime; we don't need Node-only APIs here.

**Critical: do not import from `@/lib/auth`.** That file uses `node:crypto` for PKCE helpers. Importing it into middleware would force Node runtime (or break the build under Edge). Inline the small constants this middleware needs:

```typescript
const COOKIE_NAME = "spotify_session"; // duplicate of COOKIE_NAMES.session
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const REFRESH_BUFFER_MS = 60_000; // refresh 60s before expiry
```

Yes this is duplication. The alternative is splitting `lib/auth.ts` into a pure-types file + a crypto-using file, which is more code reorganization than PR 4 should carry. Document the duplication in a comment.

**Step-by-step logic:**

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const cookie = request.cookies.get("spotify_session");
  if (!cookie) return response;

  let session: { accessToken: string; refreshToken: string; expiresAt: number };
  try {
    session = JSON.parse(cookie.value);
    if (typeof session.refreshToken !== "string" || typeof session.expiresAt !== "number") {
      response.cookies.delete("spotify_session");
      return response;
    }
  } catch {
    response.cookies.delete("spotify_session");
    return response;
  }

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
    return response;
  }

  if (tokenResponse.status === 400 || tokenResponse.status === 401) {
    response.cookies.delete("spotify_session");
    return response;
  }
  if (!tokenResponse.ok) return response;

  let tokens: { access_token?: string; refresh_token?: string; expires_in?: number };
  try {
    tokens = await tokenResponse.json();
  } catch {
    return response;
  }

  if (typeof tokens.access_token !== "string" || typeof tokens.expires_in !== "number") {
    return response;
  }

  const newSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  response.cookies.set("spotify_session", JSON.stringify(newSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export const config = { matcher: ["/"] };
```

**Why this shape:**

- All failure branches return the existing `response` (which is `NextResponse.next()`) so the request always continues — middleware never blocks the user
- Cookie deletion only happens on a clear "refresh token is dead" signal (400 or 401 from Spotify, or malformed cookie). Network failures keep the existing cookie so a momentary Spotify hiccup doesn't log the user out
- `tokens.refresh_token ?? session.refreshToken` handles Spotify's rotation behavior — sometimes they issue a new refresh token, sometimes they don't. Either way, the next refresh attempt has a valid one
- `expiresAt > Date.now() + 60_000` early return is the fast path — most requests skip the refresh, just return `next()` and add ~1ms of overhead

## `getTopTracks()` and data fetching

**Spotify endpoint:** `GET https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10` with `Authorization: Bearer <access_token>`

**Documented response shape (narrowed to what we use):**

```typescript
{
  items: Array<{
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      name: string;
      images: Array<{ url: string; height: number; width: number }>;
    };
  }>;
  total: number;
  // ...other fields we don't use
}
```

**New types in `lib/spotify.ts`:**

```typescript
export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
};

export type SpotifyApiFailureReason = "http" | "network" | "parse"; // renamed from GetMeFailureReason

export type GetTopTracksResult =
  | { ok: true; tracks: SpotifyTrack[] }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };
```

**Rename:** `GetMeFailureReason` → `SpotifyApiFailureReason`. Update all references (just `GetMeResult` type uses it).

**`getTopTracks` shape mirrors `getMe` exactly** — same try/catch around `fetch()` and `response.json()`, same discriminated union return shape. Mostly copy-paste of `getMe`'s body with the URL and parsed shape swapped.

**Default args:** `{ limit: 10, timeRange: "short_term" }` if caller omits them. For PR 4, only the home page calls this and always with defaults; PR 5+ will pass `timeRange` to switch windows.

## Page integration

**Updated `ViewState`:**

```typescript
type ViewState =
  | { kind: "anonymous" }
  | { kind: "logged-in"; displayName: string; tracks: SpotifyTrack[] }
  | { kind: "expired" }
  | { kind: "spotify-down" };
```

**Updated `resolveViewState`:**

```typescript
async function resolveViewState(): Promise<ViewState> {
  const session = await getSession();
  if (!session) return { kind: "anonymous" };

  const [meResult, tracksResult] = await Promise.all([
    getMe(session.accessToken),
    getTopTracks(session.accessToken, { limit: 10, timeRange: "short_term" }),
  ]);

  // Strict: either failure → spotify-down (unless it's a definitive 401)
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
    displayName: meResult.profile.display_name ?? meResult.profile.id,
    tracks: tracksResult.tracks,
  };
}
```

**Card render — logged-in branch:**

```tsx
{view.kind === "logged-in" && (
  <CardDescription>
    Logged in as <strong>{view.displayName}</strong>
  </CardDescription>
)}
{/* ... other description branches ... */}
</CardHeader>
<CardContent className="space-y-4">
  {view.kind === "logged-in" && <TopTracks tracks={view.tracks} />}
  {view.kind === "logged-in" ? <LogoutButton /> : <LoginButton />}
</CardContent>
```

Card width stays `max-w-md` for the spec. Revisit at execution if it looks cramped — may bump to `max-w-lg`.

## `<TopTracks>` component

**File:** `src/components/top-tracks.tsx`

```tsx
import type { SpotifyTrack } from "@/lib/spotify";

export function TopTracks({ tracks }: { tracks: SpotifyTrack[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Your top tracks (last 4 weeks)
      </h2>
      {tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No top tracks yet. Listen to some music on Spotify and come back in a few days.
        </p>
      ) : (
        <ol className="space-y-2">
          {tracks.map((track, i) => {
            const thumbnail = track.album.images[2] ?? track.album.images[1] ?? track.album.images[0];
            return (
              <li key={track.id} className="flex items-center gap-3">
                <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                {thumbnail && (
                  <img
                    src={thumbnail.url}
                    alt={track.album.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
```

**Design choices:**

- **Plain `<img>`** not Next.js `<Image>` — keeps it simple, no `next.config.ts` domain whitelisting, no SSR optimization overhead for 10 small thumbnails. PR 9 polish.
- **`tabular-nums`** on the rank — keeps rank widths aligned (1 and 10 take the same column width).
- **`truncate`** on text rows — long track titles or "feat. Artist X, Artist Y, Artist Z" lists get ellipsis instead of overflowing the row.
- **`smallest-image`** fallback chain (`images[2] ?? images[1] ?? images[0]`) — Spotify almost always returns 3 sizes (640, 300, 64) but we don't assume that. If an album somehow returns just one image we use it.
- **Empty state** handled inline — when `tracks.length === 0` we render a placeholder message instead of an empty list.

## Edge cases

| Case | Handling |
|---|---|
| User has 0 top tracks | Empty state placeholder copy renders |
| User has 1–9 tracks | Renders whatever count we got; no padding |
| Album with no images | Row shows rank + text only |
| Track with no artists | Second line renders empty (cosmetic, not a crash) |
| Refresh token revoked | Middleware deletes cookie, anonymous state |
| Middleware can't reach Spotify | Old cookie kept; page tries API, fails, renders `spotify-down` |
| Cookie's `expiresAt` is 1970 (forged) | Middleware tries refresh, fails (refresh token also probably bad), deletes cookie |
| Middleware succeeds but `/v1/me` 401s (rare race) | Page renders `expired` state (still better than crashing) |
| Both API calls fail with different statuses | First failure wins; strict spotify-down |

## Verification plan

Manual via Claude in Chrome MCP. Will runs `npm run dev`, Claude drives.

1. **Fresh login → real data appears.** Visit `127.0.0.1:3000`, click login, complete consent (might skip if recently consented), land on `/`. Should render the Card with display name + "Your top tracks (last 4 weeks)" heading + 10 rows each with rank + thumbnail + track name + artists.
2. **Real data sanity.** Track names and artist names should match Will's actual recent listening. Album thumbnails should load (no broken image icons).
3. **Token refresh on demand.** In DevTools, edit `spotify_session` cookie value: change `expiresAt` to `1` (Unix epoch). Reload `/`. Middleware should refresh. After reload, inspect cookie again — `accessToken` value should be different (proves refresh happened), `expiresAt` should be ~1 hour in the future.
4. **Refresh fails gracefully.** Open `https://spotify.com/account` → Apps → revoke "Spotify Wrapped" app's access. Then reload `/` locally. Middleware will try to refresh with the now-invalid refresh token, get 400 `invalid_grant`, delete the cookie. Page renders anonymous state (login button).
5. **Spotify-down state.** A 401 from Spotify routes to `expired`, not `spotify-down` — so to actually reach `spotify-down`, the failure must be non-401 (5xx, network failure, or parse error). Hardest to simulate manually; cheapest way: open Chrome DevTools → Network tab → right-click `api.spotify.com` requests → "Block request domain". Reload `/` — both calls fail at the network layer, middleware can still talk to Spotify (different host), but `getMe` and `getTopTracks` return `{ ok: false, reason: "network" }`. Page renders `spotify-down`. Acceptable to skip this verification if the DevTools dance is too fiddly — the code path is functionally identical to PR 3's `spotify-down` state, which was already verified.
6. **Empty top tracks.** Not practical to test on Will's account (years of listening data). Acceptable to skip.
7. **Production parity.** After merge, repeat 1, 2, 3 on `https://spotify-wrapped-lemon.vercel.app`.

## Risks / things that could go sideways

- **Spotify API contract change.** `/v1/me/top/tracks` response shape has been stable for years but if Spotify adds required fields or changes types, our type-assertion-without-validation could let invalid data through. Mitigated by the strict error policy (any non-200 → spotify-down) — but if Spotify returns 200 with a broken shape, we'd write broken data to the cookie. The deferred PR-3-debt chip "Validate Spotify token response shape" is the right pattern; consider applying the same defensive validation to `getTopTracks`.
- **Edge runtime constraints.** If middleware ever needs `node:crypto` or other Node-only modules, we'd have to pin runtime to nodejs. For PR 4 we're fine — pure fetch + JSON + cookies — but PR 5+ should keep checking this.
- **Middleware matcher being too narrow.** Pinning to `["/"]` means PR 4 won't refresh tokens for other routes. PR 5 will need to extend this when `/api/spotify/*` or `/dashboard` routes appear. Easy fix at that time.
- **Race condition between middleware refresh and concurrent requests.** Two tabs reload at the same expiry boundary. Both middleware instances try to refresh. Spotify rotates the refresh token; one tab's refresh succeeds (gets new tokens), the other gets `invalid_grant` (because its refresh token was just rotated). Tab 2 deletes its cookie, user sees anonymous state in tab 2. Annoying but recoverable (re-login). Not worth solving in PR 4 — would require a distributed lock or refresh deduplication. Acceptable tradeoff.
- **Spotify CDN domain not whitelisted for Next.js `<Image>`.** We're using plain `<img>` so this doesn't matter for PR 4. If a future PR migrates to `<Image>`, will need to add the domain in `next.config.ts`.
