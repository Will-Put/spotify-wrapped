# PR 6 — Recently played + now playing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live-polling "now playing" indicator and a server-rendered "recently played" list (with relative timestamps) to the logged-in home page.

**Architecture:** A `/api/now-playing` route handler reads the session cookie and proxies Spotify's currently-playing endpoint; a `"use client"` component polls it every 20s. Recently-played is fetched server-side alongside tracks/artists. The token-refresh proxy matcher widens to cover the polling route.

**Tech Stack:** Next.js 16.2.6 (App Router, route handlers, client components with `useEffect`/`useState`), TypeScript, Tailwind, `Intl.RelativeTimeFormat`. Spotify Web API. No new dependencies.

---

## Testing approach (read before starting)

Manual verification, not automated tests — same as PR 3–5 (no test framework; mocking Spotify is high-cost). Per-code-task gate: `npx tsc --noEmit` + `npm run lint`. `npm run build` is the integration gate. End-to-end behavioral verification (including the live polling) is **Task 7** in Chrome. Deliberate, spec-aligned deviation from the skill's TDD default.

## Reference: spec

`docs/superpowers/specs/2026-05-28-pr-6-recently-played-now-playing-design.md`. This plan implements it directly.

---

## Task 0: Confirm the branch

- [ ] **Step 1: Verify branch**

Run: `git branch --show-current`
Expected: `pr-6-recently-played`. If not, `git checkout pr-6-recently-played`.

- [ ] **Step 2: Verify clean tree + spec present**

Run: `git log --oneline -2 && git status --short`
Expected: HEAD is `956824e docs: PR 6 spec...`; working tree shows only the untracked root screenshot.

---

## Task 1: Add `getRecentlyPlayed` + `getNowPlaying` to `src/lib/spotify.ts`

**Files:**
- Modify: `src/lib/spotify.ts`

- [ ] **Step 1: Add recently-played types + helper at the end of the file**

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

- [ ] **Step 2: Add now-playing type + helper at the end of the file**

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

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/spotify.ts
git commit -m "feat: add getRecentlyPlayed and getNowPlaying helpers"
```

---

## Task 2: Add the relative-time helper

**Files:**
- Create: `src/lib/time.ts`

- [ ] **Step 1: Create the file**

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

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/time.ts
git commit -m "feat: add formatRelativeTime helper"
```

---

## Task 3: Add the `/api/now-playing` route handler

**Files:**
- Create: `src/app/api/now-playing/route.ts`

- [ ] **Step 1: Create the route**

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

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Smoke-test the route returns JSON**

Start the dev server (`npm run dev`), then:
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/now-playing`
Expected: `200`. (curl has no session cookie → body is `{"playing":false}`.) Stop the server after.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/now-playing/route.ts
git commit -m "feat: add /api/now-playing route for client polling"
```

---

## Task 4: Widen the proxy matcher to cover the polling route

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Update the matcher**

Find:

```typescript
export const config = { matcher: ["/"] };
```

Replace with:

```typescript
export const config = { matcher: ["/", "/api/now-playing"] };
```

No other change to this file. (The refresh logic + same-request propagation already work for any matched route.)

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: run token-refresh proxy on /api/now-playing too"
```

---

## Task 5: Create the `<NowPlaying>` client component

**Files:**
- Create: `src/components/now-playing.tsx`

- [ ] **Step 1: Create the file**

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

**Critical:** `import type { NowPlayingResult }` — must be a type-only import so the client bundle doesn't pull `spotify.ts`'s server code (`next/headers`). A value import here would break the client build.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/now-playing.tsx
git commit -m "feat: add NowPlaying client component with 20s polling"
```

---

## Task 6: Create the `<RecentlyPlayed>` component + wire everything into the page

**Files:**
- Create: `src/components/recently-played.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/recently-played.tsx`**

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

- [ ] **Step 2: Update imports in `src/app/page.tsx`**

Add to the component imports (alongside `TopArtists`/`TopTracks`):

```tsx
import { NowPlaying } from "@/components/now-playing";
import { RecentlyPlayed } from "@/components/recently-played";
```

And add to the `@/lib/spotify` import block: `getRecentlyPlayed` and `type RecentlyPlayedItem`. The block becomes:

```tsx
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
```

- [ ] **Step 3: Extend the `logged-in` ViewState**

Add `recentlyPlayed` to the logged-in variant:

```tsx
  | {
      kind: "logged-in";
      displayName: string;
      timeRange: TimeRange;
      tracks: SpotifyTrack[];
      artists: SpotifyArtist[];
      recentlyPlayed: RecentlyPlayedItem[];
    }
```

- [ ] **Step 4: Add recently-played to the parallel fetch + failure check**

In `resolveViewState`, change the `Promise.all` and add the fourth check. The relevant block becomes:

```tsx
  const [meResult, tracksResult, artistsResult, recentResult] =
    await Promise.all([
      getMe(session.accessToken),
      getTopTracks(session.accessToken, { limit: 10, timeRange }),
      getTopArtists(session.accessToken, { limit: 10, timeRange }),
      getRecentlyPlayed(session.accessToken, { limit: 10 }),
    ]);

  if (!meResult.ok) return failureState(meResult);
  if (!tracksResult.ok) return failureState(tracksResult);
  if (!artistsResult.ok) return failureState(artistsResult);
  if (!recentResult.ok) return failureState(recentResult);

  return {
    kind: "logged-in",
    displayName: meResult.profile.display_name ?? meResult.profile.id,
    timeRange,
    tracks: tracksResult.tracks,
    artists: artistsResult.artists,
    recentlyPlayed: recentResult.items,
  };
```

- [ ] **Step 5: Render `<NowPlaying>` + `<RecentlyPlayed>` in the card**

Replace the logged-in fragment in `CardContent`:

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

- [ ] **Step 6: Type check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: All PASS. Build lists `ƒ /api/now-playing` as a route and still shows `ƒ Proxy (Middleware)`.

- [ ] **Step 7: Commit**

```bash
git add src/components/recently-played.tsx src/app/page.tsx
git commit -m "feat: render NowPlaying + RecentlyPlayed on the home page"
```

---

## Task 7: End-to-end verification (Claude in Chrome)

**No files.** Run `npm run dev`. Claude drives Chrome; Will controls his Spotify playback.

- [ ] **Step 1: Recently played renders**

Visit `http://127.0.0.1:3000`. Screenshot. Expected: a "Recently played" section (~10 rows: art + track + artists + relative time like "X min ago"). Times plausible vs Will's listening.

- [ ] **Step 2: Now playing appears live**

Will starts a song in his Spotify app. Wait ~20s, screenshot (no reload). Expected: a "Now playing" row at the top with green pulse + the track Will started.

- [ ] **Step 3: Track change updates live**

Will skips to a different song. Wait ~20s, screenshot. Expected: indicator now shows the new track, no reload.

- [ ] **Step 4: Disappears when stopped**

Will pauses/stops playback. Wait ~20s, screenshot. Expected: the now-playing row is gone.

- [ ] **Step 5: Console check**

Check the browser console during polling. Expected: no errors.

- [ ] **Step 6: Compare to spec**

Confirm with Will: layout order is now-playing (top) → toggle → tracks → artists → recently-played (bottom).

---

## Task 8: PR → self-review → merge → production verify

- [ ] **Step 1: Push**

```bash
git push -u origin pr-6-recently-played
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "PR 6 — Recently played + now playing" --body "$(cat <<'EOF'
## Summary
- Add a live "now playing" indicator that polls `/api/now-playing` every 20s (first client component); hides when nothing's playing
- Add a server-rendered "recently played" list (last 10) with relative timestamps
- New `getNowPlaying` / `getRecentlyPlayed` helpers + `formatRelativeTime`; widen proxy matcher to cover the polling route

## Notes
- Handles Spotify's 204 "nothing playing" (a success, not an error), plus paused / podcast / ad cases.
- `now-playing.tsx` uses `import type` so the client bundle doesn't pull server code.

## Test plan
- [x] Recently played renders with relative times
- [x] Now playing appears/updates/disappears live within ~20s (no reload)
- [x] No console errors during polling
- [x] tsc + lint + build pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: `/code-review`**

Run `/code-review`. Triage with Will (use `/superpowers:receiving-code-review` for unclear feedback). Fix what matters, push, defer the rest.

- [ ] **Step 4: Merge**

`gh pr merge <PR#> --squash --delete-branch`, then `git checkout main && git pull`.

- [ ] **Step 5: Production verify**

After Vercel deploys `main`, verify on `https://spotify-wrapped-lemon.vercel.app` (canonical, not preview). Will logs in, plays a song, confirms the live indicator works in production.

---

## Task 9: Wrap-up + handoff

- [ ] **Step 1: Tick the PR 6 box in `PROGRESS.md`** (`- [ ]` → `- [x]`).

- [ ] **Step 2: Run `/handoff`** → writes `docs/handoffs/session-11.md`. Handoff + plan + PROGRESS tick ride along with the next branch's first commit (main branch-protected), same pattern as PR 5/6.

---

## Self-review notes (plan author)

- **Spec coverage:** now-playing helper ✓ (T1), recently-played helper ✓ (T1), relative-time ✓ (T2), API route ✓ (T3), proxy matcher widen ✓ (T4), NowPlaying client component ✓ (T5), RecentlyPlayed + page wiring ✓ (T6), verification incl. live polling ✓ (T7). 204/paused/podcast handling ✓ (T1 getNowPlaying). Out-of-scope items (controls, progress bar, visibility-pause, pagination) correctly absent.
- **Type consistency:** `NowPlayingResult` defined T1, consumed in API route (T3) + NowPlaying (T5). `RecentlyPlayedItem`/`GetRecentlyPlayedResult` defined T1, consumed in RecentlyPlayed (T6) + page (T6). `getRecentlyPlayed(accessToken, {limit})` signature matches T6 call. `failureState` (from PR 5) reused on `recentResult` (T6) — `GetRecentlyPlayedResult` failure shape matches. `formatRelativeTime(iso)` defined T2, called T6.
- **No placeholders:** every code step shows complete code; commands show expected output.
- **Ordering note:** Task 5 (NowPlaying, imports `NowPlayingResult` from T1) and Task 6 (imports from T1/T2) depend on T1/T2 — tasks are ordered so dependencies land first.
