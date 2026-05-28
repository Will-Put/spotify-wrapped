# PR 6 — Recently played + now playing (design)

**Date:** 2026-05-28
**Branch:** `pr-6-recently-played`
**Status:** Design approved in brainstorm; spec for user review before planning.

## Goal

Add two listening-activity features to the logged-in home page:
1. **Now playing** — a live indicator at the top of the card that shows the track currently playing on the user's Spotify and **updates itself every ~20s** (polling). Hidden when nothing is playing.
2. **Recently played** — a server-rendered list at the bottom of the card showing the user's last 10 plays, each with a relative timestamp ("12 min ago").

This is PR 6 of Phase 2. It builds on PR 5 (toggle + tracks + artists).

## Why this design (one-paragraph summary)

The now-playing indicator is the new concept: **client-side polling**. The access token lives in an httpOnly cookie that browser JS cannot read, so the client can't call Spotify directly. Instead we add a thin server route (`/api/now-playing`) that reads the cookie, asks Spotify, and returns a small JSON answer; a `"use client"` component polls that route on an interval. Recently-played, by contrast, changes slowly and stays server-rendered (fetched alongside tracks/artists, updates on reload) — no need to poll it. Both reuse the existing `SpotifyTrack` shape and the established discriminated-union/error patterns.

## In scope

- **Now playing:** `<NowPlaying>` client component polling `GET /api/now-playing` every 20s; shows album art + track + artists + a "playing" pulse; renders nothing when not playing
- **`/api/now-playing` route handler:** reads session, calls Spotify `currently-playing`, returns `{ playing: false }` or `{ playing: true, track }`
- **`getNowPlaying(accessToken)` helper:** handles the 204 (nothing playing), paused, and non-track (podcast/ad) cases — all → not playing
- **Recently played:** `getRecentlyPlayed()` helper + `RecentlyPlayedItem` type; `<RecentlyPlayed>` server component; relative-time formatting
- **`formatRelativeTime()` helper** in `src/lib/time.ts` (uses `Intl.RelativeTimeFormat`)
- **Widen the proxy matcher** to `["/", "/api/now-playing"]` so the polling route gets token refresh too
- **page.tsx:** add recently-played to the parallel fetch; render `<NowPlaying>` at top + `<RecentlyPlayed>` at bottom of the logged-in card
- Manual verification via Claude in Chrome MCP

## Out of scope (deferred)

- **Polling pause when tab is backgrounded** (visibility API optimization) → possible PR 9 polish; 20s polling is light enough to skip for now
- **Progress bar / scrubber** on now-playing → not needed
- **Pause/play controls** → this is a read-only dashboard, not a player
- **Recently-played pagination / "before" cursor** → just the last 10
- **Genre breakdown** → PR 7 · **KPI cards** → PR 8 · **Polish/skeletons** → PR 9
- **Automated tests** — manual verification only, consistent with PR 3–5

## New concept this PR introduces — client-side polling via a server route

PR 3–5 were entirely server-rendered: the page reads cookies on the server, fetches, renders once. "Now playing" needs to update *without* a reload, which means client-side JavaScript. But the client can't hold the Spotify token (httpOnly cookie, by design from PR 3). The pattern:

1. **`/api/now-playing`** (server route handler) reads the `spotify_session` cookie via `getSession()`, calls Spotify, returns small JSON. The token never reaches the browser.
2. **`<NowPlaying>`** (`"use client"`) calls `fetch("/api/now-playing")` on mount and every 20s via `setInterval`, storing the result in `useState`. Interval cleared on unmount.

This is the first client component with state/effects in the app. Everything else stays server-rendered.

### Token refresh for the polling route

The proxy (token refresher) currently matches only `["/"]`. The polling route hits `/api/now-playing`, so we **widen the matcher to `["/", "/api/now-playing"]`**. Because the proxy already propagates the refreshed cookie to the same request (the PR 4 fix: `request.cookies.set` + `next({ request })`), the route handler's `getSession()` reads the fresh token in the same request. No other proxy change needed.

## Architecture

### New files

| Path | Responsibility |
|---|---|
| `src/app/api/now-playing/route.ts` | GET handler. `getSession()` → `getNowPlaying(token)` → `NextResponse.json(result)`. Returns `{ playing: false }` when no session. |
| `src/components/now-playing.tsx` | `"use client"`. Polls `/api/now-playing` every 20s; renders the current track + pulse, or nothing. |
| `src/components/recently-played.tsx` | Server Component. Takes `items: RecentlyPlayedItem[]`. Renders art + track + artists + relative time per row. |
| `src/lib/time.ts` | `formatRelativeTime(iso)` helper (relative timestamps). |

### Modified files

| Path | Change |
|---|---|
| `src/lib/spotify.ts` | Add `RecentlyPlayedItem` + `GetRecentlyPlayedResult` types + `getRecentlyPlayed()`; add `NowPlayingResult` type + `getNowPlaying()`. |
| `src/proxy.ts` | Matcher → `["/", "/api/now-playing"]`. |
| `src/app/page.tsx` | Add `getRecentlyPlayed` to the parallel fetch; `logged-in` carries `recentlyPlayed`; render `<NowPlaying>` (top) + `<RecentlyPlayed>` (bottom). |

### Unchanged

- `src/lib/auth.ts`, `src/lib/url.ts`, auth route handlers, `TopTracks`/`TopArtists`/`TimeRangeToggle` — no change.

## Data layer — `lib/spotify.ts`

### Recently played

```typescript
export type RecentlyPlayedItem = {
  track: SpotifyTrack;
  playedAt: string; // ISO 8601, from the API's `played_at`
};

export type GetRecentlyPlayedResult =
  | { ok: true; items: RecentlyPlayedItem[] }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };

type RecentlyPlayedOptions = { limit?: number };

export async function getRecentlyPlayed(
  accessToken: string,
  options: RecentlyPlayedOptions = {},
): Promise<GetRecentlyPlayedResult> {
  const { limit = 10 } = options;
  const url = `${SPOTIFY_API}/me/player/recently-played?limit=${limit}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, reason: "network" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, reason: "http" };
  }

  try {
    const data = (await response.json()) as {
      items?: { track: SpotifyTrack; played_at: string }[];
    };
    if (!Array.isArray(data.items)) {
      return { ok: false, status: response.status, reason: "parse" };
    }
    const items = data.items.map((it) => ({
      track: it.track,
      playedAt: it.played_at,
    }));
    return { ok: true, items };
  } catch {
    return { ok: false, status: response.status, reason: "parse" };
  }
}
```

Note: recently-played can contain the **same track id more than once** (a song played twice). The component must key rows by `playedAt` (unique per play), not `track.id`.

### Now playing

Non-critical widget — any failure resolves to "not playing" (no discriminated error union; the indicator just hides).

```typescript
export type NowPlayingResult =
  | { playing: false }
  | { playing: true; track: SpotifyTrack };

export async function getNowPlaying(
  accessToken: string,
): Promise<NowPlayingResult> {
  let response: Response;
  try {
    response = await fetch(`${SPOTIFY_API}/me/player/currently-playing`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { playing: false };
  }

  // 204 = nothing playing (success, NOT an error). Any non-2xx → hide.
  if (response.status === 204 || !response.ok) {
    return { playing: false };
  }

  try {
    const data = (await response.json()) as {
      is_playing?: boolean;
      currently_playing_type?: string;
      item?: SpotifyTrack | null;
    };
    // Only show actively-playing *tracks* (not paused, not podcasts/ads).
    if (
      !data.is_playing ||
      data.currently_playing_type !== "track" ||
      !data.item
    ) {
      return { playing: false };
    }
    return { playing: true, track: data.item };
  } catch {
    return { playing: false };
  }
}
```

## API route — `src/app/api/now-playing/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getNowPlaying, getSession } from "@/lib/spotify";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ playing: false });
  const result = await getNowPlaying(session.accessToken);
  return NextResponse.json(result);
}
```

Reading `cookies()` (via `getSession`) makes the route dynamic automatically — no caching of the polled result. The proxy refreshes the token before this runs (matcher now includes `/api/now-playing`).

## `<NowPlaying>` client component — `src/components/now-playing.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import type { NowPlayingResult } from "@/lib/spotify";

const POLL_MS = 20_000;

export function NowPlaying() {
  const [state, setState] = useState<NowPlayingResult>({ playing: false });

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/now-playing");
        if (!res.ok) return;
        const data = (await res.json()) as NowPlayingResult;
        if (active) setState(data);
      } catch {
        // transient network error — keep the last known state
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!state.playing) return null;

  const track = state.track;
  const thumbnail =
    track.album.images[2] ?? track.album.images[1] ?? track.album.images[0];

  return (
    <div className="flex items-center gap-3 rounded-lg border p-2">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      </span>
      {thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail.url}
          alt={track.album.name}
          width={40}
          height={40}
          className="rounded"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">Now playing</p>
        <p className="truncate text-sm font-medium">{track.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artists.map((a) => a.name).join(", ")}
        </p>
      </div>
    </div>
  );
}
```

**Notes:**
- `import type { NowPlayingResult }` — type-only import is erased at compile, so the client bundle never pulls `spotify.ts`'s server code (`next/headers`). This is required; a value import would break the client build.
- Green `animate-ping` dot = the "live" affordance.
- `active` flag prevents a state update after unmount (avoids a React warning if a fetch resolves late).

## Relative time — `src/lib/time.ts`

```typescript
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Format an ISO timestamp as e.g. "12 minutes ago", "3 hours ago". */
export function formatRelativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(-diffDay, "day");
}
```

Computed at server-render time. Won't tick without a reload — acceptable (recently-played isn't polled). Negative diffs (clock skew) fall into `< 60` → "just now".

## `<RecentlyPlayed>` component — `src/components/recently-played.tsx`

```tsx
import type { RecentlyPlayedItem } from "@/lib/spotify";
import { formatRelativeTime } from "@/lib/time";

export function RecentlyPlayed({ items }: { items: RecentlyPlayedItem[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Recently played
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing played recently. Go listen to something!
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => {
            const track = item.track;
            const thumbnail =
              track.album.images[2] ??
              track.album.images[1] ??
              track.album.images[0];
            return (
              <li key={item.playedAt} className="flex items-center gap-3">
                {thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
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
                <span className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatRelativeTime(item.playedAt)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
```

No rank numbers (it's chronological, not a ranking). Time sits right-aligned per row.

## Page integration — `src/app/page.tsx`

- Extend `logged-in` ViewState with `recentlyPlayed: RecentlyPlayedItem[]`.
- Add `getRecentlyPlayed` to the `Promise.all` and a fourth `if (!recentResult.ok) return failureState(recentResult);` check.
- Render order inside the logged-in fragment:

```tsx
{view.kind === "logged-in" && (
  <>
    <NowPlaying />
    <TimeRangeToggle current={view.timeRange} />
    <TopTracks tracks={view.tracks} />
    <TopArtists artists={view.artists} />
    <RecentlyPlayed items={view.recentlyPlayed} />
  </>
)}
```

`<NowPlaying />` takes no props (it fetches its own data). It's a client component rendered inside the server component — fine in the App Router.

## Proxy change — `src/proxy.ts`

```typescript
export const config = { matcher: ["/", "/api/now-playing"] };
```

Only the matcher line changes. The refresh logic (and the same-request propagation fix) already work for any matched route.

## Edge cases

| Case | Handling |
|---|---|
| Nothing playing (204) | `getNowPlaying` → `{ playing: false }` → indicator hidden |
| Playback paused | `is_playing: false` → hidden |
| Podcast / ad playing | `currently_playing_type !== "track"` → hidden |
| Now-playing fetch fails (network/5xx/401) | `{ playing: false }` → hidden (non-critical) |
| Recently-played empty | Empty-state copy |
| Duplicate track in recently-played | Keyed by `playedAt` (unique per play) |
| Track with no album image | Row shows text only |
| Polling while logged out | Route returns `{ playing: false }`; but `<NowPlaying>` only renders in logged-in state anyway |
| Token expires mid-session | Proxy (now matching `/api/now-playing`) refreshes before route + page run |
| Clock skew (future timestamp) | `formatRelativeTime` → "just now" |

## Verification plan

Manual via Claude in Chrome MCP. Will runs `npm run dev`, Claude drives.

1. **Recently played renders.** Logged-in card shows a "Recently played" section with ~10 rows, each with art + track + artists + a relative time ("X min/hours ago"). Times look plausible vs Will's listening.
2. **Now playing — appears live.** Will starts a song in his Spotify app. Within ~20s the "Now playing" row appears at the top **without a reload** (green pulse + that track). Confirm it matches what he started.
3. **Now playing — track change.** Will skips to another song; within ~20s the indicator updates to the new track, no reload.
4. **Now playing — disappears.** Will pauses/stops; within ~20s the indicator vanishes.
5. **Nothing playing.** With nothing playing, no indicator is shown (just toggle/tracks/artists/recently-played).
6. **No crashes** across the above; check the browser console for errors during polling.
7. **Production parity.** After merge, repeat 1–4 on the canonical Vercel URL.

## Risks / things that could go sideways

- **`currently-playing` 204 + `.json()`** — calling `.json()` on a 204 throws; the code returns early on `status === 204` *before* parsing. Confirm that ordering survives implementation.
- **Client bundle pulling server code** — `now-playing.tsx` must use `import type` for `NowPlayingResult`; a value import would drag `spotify.ts` (and `next/headers`) into the client build and break it.
- **Polling cost** — 20s interval is light. If it ever feels heavy, add visibility-pause (PR 9).
- **Proxy matcher** — adding `/api/now-playing` means the proxy now runs on that route; verify the route still returns JSON correctly (proxy `next()` just continues the request).
- **Relative time staleness** — server-rendered, so "12 min ago" is frozen until reload. Acceptable; not worth client-side ticking in PR 6.
