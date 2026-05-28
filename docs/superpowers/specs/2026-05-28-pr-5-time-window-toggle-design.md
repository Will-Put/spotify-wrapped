# PR 5 — Time-window toggle + top artists (design)

**Date:** 2026-05-28
**Branch:** `pr-5-time-window`
**Status:** Design approved in brainstorm; spec for user review before planning.

## Goal

The logged-in home page gains a **time-window toggle** (Last 4 weeks / Last 6 months / All time) that controls both the existing **top tracks** list and a new **top artists** list. The selected window is carried in the URL (`/?range=short_term|medium_term|long_term`) so it survives reloads and is shareable. Artists render in the same numbered-list style as tracks, with each artist's top genre as the second line.

This is PR 5 of Phase 2. It builds directly on PR 4 (top tracks + token-refresh proxy).

## Why this design (one-paragraph summary)

The window lives in the URL as a search param, not in client-side state, because the page is already a Server Component that fetches on the server — reading `searchParams` and refetching is the natural, robust extension, and it makes the selection shareable/reload-safe for free. The toggle is **three links styled as buttons** (Approach A from the brainstorm): each links to `/?range=<value>`, the server reads the URL and fetches the matching window, and the active button is derived from the current param. No client-side state means nothing to get out of sync — avoiding the class of same-request state bug that `/code-review` caught in PR 4. Top artists reuse the exact list pattern of top tracks for consistency and minimal new surface.

## In scope

- Time-window toggle: 3 options, controls tracks **and** artists together, one URL param
- URL param `range` with values `short_term` | `medium_term` | `long_term` (Spotify's own names — no translation layer); missing/invalid → `short_term`
- New `getTopArtists()` helper + `SpotifyArtist` type in `lib/spotify.ts`
- New `parseTimeRange()` helper + shared `TimeRange` type
- New `<TimeRangeToggle current={...}>` Server Component (links styled via `buttonVariants`)
- New `<TopArtists artists={...}>` Server Component (numbered list, square photo, name, top-genre second line)
- Update `<TopTracks>` heading: drop the hardcoded "(last 4 weeks)" → "Top tracks" (the window is now variable; the toggle communicates it)
- `page.tsx`: read async `searchParams`, fetch profile + tracks + artists in parallel for the chosen window
- Strict error policy unchanged: any non-401 failure → `spotify-down`; 401 → `expired`
- Manual verification via Claude in Chrome MCP

## Out of scope (deferred)

- **Loading skeletons / Suspense** during the window switch → PR 9
- **Genre breakdown chart** (counting genres across artists) → PR 7 (we show one genre per artist row here, not an aggregate)
- **Recently played / now playing** → PR 6
- **KPI / aggregate cards** → PR 8
- **Independent windows per section** — rejected in brainstorm (one toggle controls both)
- **Friendly URL values** (`4weeks`/`6months`/`all`) — rejected in brainstorm (use Spotify's names directly)
- **Automated tests** — manual verification only, consistent with PR 3/PR 4

## New concept this PR introduces — URL search params as server state

PR 4's home page took no inputs. PR 5 makes the page's output depend on the URL's query string. In the Next.js App Router:

- `page.tsx` receives `searchParams` as a prop. **In Next.js 16 this is a Promise** (async Request APIs — same breaking-change family as the middleware→proxy rename). So: `export default async function Home({ searchParams }: { searchParams: Promise<{ range?: string }> })` and `const { range } = await searchParams;`.
- The toggle doesn't need JavaScript: each option is a `<Link href={`/?range=...`}>`. Clicking it is a normal navigation; Next.js re-renders the Server Component with the new `searchParams`, which refetches the right window. The "active" state is computed on the server by comparing each option to the current value.

This is the teaching contrast with PR 4's proxy: there, the new concept was *intercepting* requests; here, it's *parameterizing* a server render from the URL.

## Architecture

### New files

| Path | Responsibility |
|---|---|
| `src/components/time-range-toggle.tsx` | Server Component. Takes `current: TimeRange`. Renders 3 `<Link>`s styled with `buttonVariants` — `default` variant for the active window, `outline` for the others. |
| `src/components/top-artists.tsx` | Server Component. Takes `artists: SpotifyArtist[]`. Numbered list: rank + square photo + name + top-genre second line. Handles empty array + missing image/genres. |

### Modified files

| Path | Change |
|---|---|
| `src/lib/spotify.ts` | Add `TimeRange` type, `parseTimeRange()`, `SpotifyArtist` type, `GetTopArtistsResult` type, `getTopArtists()` helper. Refactor `TopTracksOptions.timeRange` to use the shared `TimeRange` type. |
| `src/components/top-tracks.tsx` | Change heading "Your top tracks (last 4 weeks)" → "Top tracks". No other change. |
| `src/app/page.tsx` | Accept async `searchParams`; parse `range`; `resolveViewState(timeRange)` fetches profile + tracks + artists in parallel; `logged-in` state carries `timeRange`, `tracks`, `artists`; render `<TimeRangeToggle>` + `<TopTracks>` + `<TopArtists>`. |

### Unchanged but worth noting

- `src/proxy.ts` — **no change.** Switching windows changes only the query string, not the path, so the `matcher: ["/"]` still fires and refreshes the token.
- `src/lib/auth.ts`, `src/lib/url.ts`, auth route handlers — no change.
- No new shadcn primitive needed — `buttonVariants` is already exported from `src/components/ui/button.tsx`.
- No new env vars.

## Data layer — `lib/spotify.ts`

### Shared time-range type + parser

```typescript
export type TimeRange = "short_term" | "medium_term" | "long_term";

const TIME_RANGES: readonly TimeRange[] = [
  "short_term",
  "medium_term",
  "long_term",
];

/** Coerce an untrusted URL value to a valid window; default to short_term. */
export function parseTimeRange(value: string | undefined): TimeRange {
  return TIME_RANGES.includes(value as TimeRange)
    ? (value as TimeRange)
    : "short_term";
}
```

`TopTracksOptions.timeRange` changes from the inline union to `TimeRange`.

### `SpotifyArtist` + `getTopArtists`

```typescript
export type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; height: number; width: number }[];
};

export type GetTopArtistsResult =
  | { ok: true; artists: SpotifyArtist[] }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };

type TopArtistsOptions = {
  limit?: number;
  timeRange?: TimeRange;
};

export async function getTopArtists(
  accessToken: string,
  options: TopArtistsOptions = {},
): Promise<GetTopArtistsResult> {
  const { limit = 10, timeRange = "short_term" } = options;
  const url = `${SPOTIFY_API}/me/top/artists?time_range=${timeRange}&limit=${limit}`;

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
    const data = (await response.json()) as { items?: SpotifyArtist[] };
    if (!Array.isArray(data.items)) {
      return { ok: false, status: response.status, reason: "parse" };
    }
    return { ok: true, artists: data.items };
  } catch {
    return { ok: false, status: response.status, reason: "parse" };
  }
}
```

This mirrors `getTopTracks` exactly (including the PR 4 review fix: `Array.isArray` guard → `parse` instead of crashing downstream).

## Page integration — `app/page.tsx`

```tsx
type ViewState =
  | { kind: "anonymous" }
  | {
      kind: "logged-in";
      displayName: string;
      timeRange: TimeRange;
      tracks: SpotifyTrack[];
      artists: SpotifyArtist[];
    }
  | { kind: "expired" }
  | { kind: "spotify-down" };

// Map any failed result to the right state. Returns null when the result is
// ok, so the caller can keep going. 401 → expired; anything else → spotify-down.
function failureState(
  result: { ok: false; status: number; reason: SpotifyApiFailureReason },
): Extract<ViewState, { kind: "expired" | "spotify-down" }> {
  if (result.reason === "http" && result.status === 401) {
    return { kind: "expired" };
  }
  return { kind: "spotify-down" };
}

async function resolveViewState(timeRange: TimeRange): Promise<ViewState> {
  const session = await getSession();
  if (!session) return { kind: "anonymous" };

  const [meResult, tracksResult, artistsResult] = await Promise.all([
    getMe(session.accessToken),
    getTopTracks(session.accessToken, { limit: 10, timeRange }),
    getTopArtists(session.accessToken, { limit: 10, timeRange }),
  ]);

  // Explicit per-result checks (matches PR 4; each `if` narrows the type so
  // the success branch sees `ok: true` with no unreachable code).
  if (!meResult.ok) return failureState(meResult);
  if (!tracksResult.ok) return failureState(tracksResult);
  if (!artistsResult.ok) return failureState(artistsResult);

  return {
    kind: "logged-in",
    displayName: meResult.profile.display_name ?? meResult.profile.id,
    timeRange,
    tracks: tracksResult.tracks,
    artists: artistsResult.artists,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const view = await resolveViewState(parseTimeRange(range));
  // ...render
}
```

The `failureState` helper keeps the three checks DRY without a loop (a loop can't narrow the union for TypeScript). Each `if (!result.ok) return failureState(result)` narrows that result to `ok: true` afterward, so the success branch type-checks with no unreachable code.

### Card render (logged-in branch)

```tsx
<CardContent className="space-y-4">
  {view.kind === "logged-in" && (
    <>
      <TimeRangeToggle current={view.timeRange} />
      <TopTracks tracks={view.tracks} />
      <TopArtists artists={view.artists} />
    </>
  )}
  {view.kind === "logged-in" ? <LogoutButton /> : <LoginButton />}
</CardContent>
```

`CardHeader` (the four `CardDescription` branches) is unchanged. Card width stays `max-w-md`; revisit at execution if the 3-button toggle row is cramped (may bump to `max-w-lg` or use smaller buttons).

## `<TimeRangeToggle>` component

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimeRange } from "@/lib/spotify";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "short_term", label: "Last 4 weeks" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "All time" },
];

export function TimeRangeToggle({ current }: { current: TimeRange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={`/?range=${opt.value}`}
          className={cn(
            buttonVariants({
              size: "sm",
              variant: opt.value === current ? "default" : "outline",
            }),
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
```

**Design choices:**
- **Links, not buttons** — pure server-side; the URL is the single source of truth. No `"use client"`, no state.
- **`buttonVariants` for styling** — uses the design system's button styles on a `<Link>` without the polymorphism API (this project's base-ui `Button` has no `asChild`). Standard shadcn pattern.
- **`flex-wrap`** — if three buttons don't fit on one line in the narrow card, they wrap instead of overflowing.

## `<TopArtists>` component

```tsx
import type { SpotifyArtist } from "@/lib/spotify";

export function TopArtists({ artists }: { artists: SpotifyArtist[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Top artists</h2>
      {artists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No top artists yet. Listen to some music on Spotify and come back in a
          few days.
        </p>
      ) : (
        <ol className="space-y-2">
          {artists.map((artist, i) => {
            const photo =
              artist.images[2] ?? artist.images[1] ?? artist.images[0];
            const topGenre = artist.genres[0];
            return (
              <li key={artist.id} className="flex items-center gap-3">
                <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt={artist.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{artist.name}</p>
                  {topGenre && (
                    <p className="truncate text-xs text-muted-foreground">
                      {topGenre}
                    </p>
                  )}
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

Mirrors `TopTracks` (same rank/thumbnail/two-line layout, same image fallback chain, same empty-state copy pattern). The genre line is omitted when an artist has no genres (Spotify returns `[]` for some artists). Genre shown as-is (lowercase, e.g. "classic rock") — Spotify's native casing; no capitalization helper.

## Edge cases

| Case | Handling |
|---|---|
| No `range` in URL | `parseTimeRange(undefined)` → `short_term` |
| `?range=garbage` | `parseTimeRange("garbage")` → `short_term` |
| User has 0 top artists | Empty-state placeholder copy |
| Artist with no image | Row shows rank + name (+ genre) only |
| Artist with no genres | Second line omitted; single-line row |
| Tracks ok but artists fail (or vice-versa) | First failure in `[me, tracks, artists]` order wins → strict `spotify-down` (or `expired` on 401) |
| Token expired on this request | Proxy refreshes (PR 4 fix); page reads fresh token, fetches selected window |

## Verification plan

Manual via Claude in Chrome MCP. Will runs `npm run dev`, Claude drives.

1. **Default window.** Visit `127.0.0.1:3000`. Logged-in card shows the toggle with "Last 4 weeks" active, top tracks, and top artists for the last 4 weeks. Artists show photo + name + genre.
2. **Switch windows.** Click "Last 6 months" → URL becomes `/?range=medium_term`, active button moves, both lists update to the 6-month window. Click "All time" → `/?range=long_term`, lists update again.
3. **Persistence.** With "All time" selected, reload the page → still shows All time (URL preserved). 
4. **Shareable.** Open `127.0.0.1:3000/?range=medium_term` directly in a fresh tab → opens straight to the 6-month view with the right button active.
5. **Invalid param.** Visit `127.0.0.1:3000/?range=banana` → falls back to Last 4 weeks (active), no crash.
6. **Data sanity.** Track/artist names and genres look like Will's real listening. Photos load (no broken images).
7. **Production parity.** After merge, repeat 1–4 on the canonical Vercel URL.

## Risks / things that could go sideways

- **`searchParams` async gotcha.** Forgetting to `await searchParams` in Next 16 is a likely error; the type (`Promise<...>`) and a build run will catch it.
- **Spotify `/me/top/artists` contract.** Same as tracks — stable for years; the `Array.isArray` guard protects against a 200 with a broken shape.
- **Toggle row width** in the `max-w-md` card — three `sm` buttons may be tight; `flex-wrap` prevents overflow, revisit sizing at execution.
- **Genre quality.** Spotify's per-artist `genres` can be empty or oddly specific ("escape room"). The row omits the line when empty; odd genres are cosmetic, not bugs. Full aggregation/cleanup is PR 7.
