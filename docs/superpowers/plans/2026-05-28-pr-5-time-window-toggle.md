# PR 5 — Time-window toggle + top artists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a URL-driven time-window toggle (4 weeks / 6 months / all time) that controls both the top-tracks list and a new top-artists list on the logged-in home page.

**Architecture:** The selected window lives in the URL search param `?range=`. The home page (a Server Component) reads async `searchParams`, parses the window, and fetches profile + tracks + artists in parallel for that window. The toggle is three `<Link>`s styled with `buttonVariants` — no client-side state. Top artists reuse the top-tracks list pattern.

**Tech Stack:** Next.js 16.2.6 (App Router, Server Components, async `searchParams`), TypeScript, shadcn/ui (`buttonVariants`), Tailwind. Spotify Web API. No new dependencies.

---

## Testing approach (read before starting)

Same as PR 3/PR 4: **manual verification, not automated tests** (no test framework installed; mocking Spotify is high-cost). Each code task's gate is `npx tsc --noEmit` + `npm run lint`. `npm run build` is the integration gate. End-to-end behavioral verification is **Task 6** (Claude in Chrome). This is a deliberate, spec-aligned deviation from the skill's TDD default — not an omission.

## Reference: spec

Full design at `docs/superpowers/specs/2026-05-28-pr-5-time-window-toggle-design.md`. This plan implements it directly.

---

## Task 0: Confirm the branch

- [ ] **Step 1: Verify current branch**

Run: `git branch --show-current`
Expected: `pr-5-time-window`

If not, `git checkout pr-5-time-window` before any edits. (The branch already exists with the PR 4 docs commit + the PR 5 spec commit.)

- [ ] **Step 2: Verify clean tree + spec present**

Run: `git log --oneline -2 && git status --short`
Expected: HEAD is `d088f9a docs: PR 5 spec...`. Working tree shows only the untracked root screenshot (no modified source).

---

## Task 1: Extend `src/lib/spotify.ts` — TimeRange, parseTimeRange, getTopArtists

**Files:**
- Modify: `src/lib/spotify.ts`

- [ ] **Step 1: Add the shared `TimeRange` type + `parseTimeRange` near the top of the types**

Add immediately after the `SpotifyApiFailureReason` type declaration:

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

- [ ] **Step 2: Refactor `TopTracksOptions` to use the shared type**

Find the existing `TopTracksOptions` (added in PR 4):

```typescript
type TopTracksOptions = {
  limit?: number;
  timeRange?: "short_term" | "medium_term" | "long_term";
};
```

Replace the inline union with the shared type:

```typescript
type TopTracksOptions = {
  limit?: number;
  timeRange?: TimeRange;
};
```

- [ ] **Step 3: Add the `SpotifyArtist` + `GetTopArtistsResult` types**

Add after the `GetTopTracksResult` type:

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
```

- [ ] **Step 4: Add the `getTopArtists()` helper at the end of the file**

```typescript
type TopArtistsOptions = {
  limit?: number;
  timeRange?: TimeRange;
};

/**
 * Call Spotify's `/v1/me/top/artists` with the given access token.
 *
 * Mirrors `getTopTracks` exactly — same options, same discriminated-union
 * return shape, same Array.isArray guard so a malformed 200 degrades to
 * spotify-down instead of crashing downstream.
 */
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

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/spotify.ts
git commit -m "feat: add getTopArtists, TimeRange type, and parseTimeRange"
```

---

## Task 2: Update the `<TopTracks>` heading (window is now variable)

**Files:**
- Modify: `src/components/top-tracks.tsx`

- [ ] **Step 1: Change the hardcoded heading**

Find:

```tsx
      <h2 className="text-sm font-medium text-muted-foreground">
        Your top tracks (last 4 weeks)
      </h2>
```

Replace with:

```tsx
      <h2 className="text-sm font-medium text-muted-foreground">Top tracks</h2>
```

No other change to this file.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/top-tracks.tsx
git commit -m "refactor: drop fixed window from TopTracks heading"
```

---

## Task 3: Create the `<TimeRangeToggle>` component

**Files:**
- Create: `src/components/time-range-toggle.tsx`

- [ ] **Step 1: Create the file**

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

Note: this project's `Button` is base-ui (no `asChild`), so we style a Next `<Link>` with the exported `buttonVariants` instead. `cn` is at `@/lib/utils` (used throughout the codebase).

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/time-range-toggle.tsx
git commit -m "feat: add TimeRangeToggle link-styled segmented control"
```

---

## Task 4: Create the `<TopArtists>` component

**Files:**
- Create: `src/components/top-artists.tsx`

- [ ] **Step 1: Create the file**

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

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/top-artists.tsx
git commit -m "feat: add TopArtists list component with top-genre subline"
```

---

## Task 5: Wire the toggle + artists + window into `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update the imports**

Replace the current import block:

```tsx
import { TopTracks } from "@/components/top-tracks";
import {
  getMe,
  getSession,
  getTopTracks,
  type SpotifyTrack,
} from "@/lib/spotify";
```

with:

```tsx
import { TimeRangeToggle } from "@/components/time-range-toggle";
import { TopArtists } from "@/components/top-artists";
import { TopTracks } from "@/components/top-tracks";
import {
  getMe,
  getSession,
  getTopArtists,
  getTopTracks,
  parseTimeRange,
  type SpotifyApiFailureReason,
  type SpotifyArtist,
  type SpotifyTrack,
  type TimeRange,
} from "@/lib/spotify";
```

(Keep the existing `Card*`, `LoginButton`, `LogoutButton` imports as they are.)

- [ ] **Step 2: Extend the `ViewState` type**

Replace:

```tsx
type ViewState =
  | { kind: "anonymous" }
  | { kind: "logged-in"; displayName: string; tracks: SpotifyTrack[] }
  | { kind: "expired" }
  | { kind: "spotify-down" };
```

with:

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
```

- [ ] **Step 3: Add the `failureState` helper + rewrite `resolveViewState`**

Replace the entire current `resolveViewState` function with:

```tsx
// Map a failed Spotify result to the right view state.
// 401 → expired (re-login fixes it); anything else → spotify-down (transient).
function failureState(result: {
  ok: false;
  status: number;
  reason: SpotifyApiFailureReason;
}): Extract<ViewState, { kind: "expired" | "spotify-down" }> {
  if (result.reason === "http" && result.status === 401) {
    return { kind: "expired" };
  }
  return { kind: "spotify-down" };
}

async function resolveViewState(timeRange: TimeRange): Promise<ViewState> {
  const session = await getSession();
  if (!session) return { kind: "anonymous" };

  // Fetch profile + tracks + artists in parallel for the chosen window.
  const [meResult, tracksResult, artistsResult] = await Promise.all([
    getMe(session.accessToken),
    getTopTracks(session.accessToken, { limit: 10, timeRange }),
    getTopArtists(session.accessToken, { limit: 10, timeRange }),
  ]);

  // Each check narrows the result to ok:true for the success branch below.
  if (!meResult.ok) return failureState(meResult);
  if (!tracksResult.ok) return failureState(tracksResult);
  if (!artistsResult.ok) return failureState(artistsResult);

  return {
    kind: "logged-in",
    // display_name can be null (rare). Fall back to the user's Spotify ID.
    displayName: meResult.profile.display_name ?? meResult.profile.id,
    timeRange,
    tracks: tracksResult.tracks,
    artists: artistsResult.artists,
  };
}
```

- [ ] **Step 4: Read the window from async `searchParams` in `Home`**

Replace the current function signature + first line:

```tsx
export default async function Home() {
  const view = await resolveViewState();
```

with:

```tsx
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const view = await resolveViewState(parseTimeRange(range));
```

(Next.js 16: `searchParams` is a Promise — must be awaited.)

- [ ] **Step 5: Render the toggle + both lists in `CardContent`**

Replace:

```tsx
        <CardContent className="space-y-4">
          {view.kind === "logged-in" && <TopTracks tracks={view.tracks} />}
          {view.kind === "logged-in" ? <LogoutButton /> : <LoginButton />}
        </CardContent>
```

with:

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

`CardHeader` is unchanged.

- [ ] **Step 6: Type check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: All PASS. Build registers the route as dynamic (it reads `searchParams` + cookies) and still lists `ƒ Proxy (Middleware)`.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: time-window toggle controlling top tracks + top artists"
```

---

## Task 6: End-to-end verification (Claude in Chrome)

**No files.** Run `npm run dev` (binds to `127.0.0.1`). Claude drives Chrome; Will reacts.

- [ ] **Step 1: Default window**

Visit `http://127.0.0.1:3000`. Screenshot.
Expected: logged-in card with the toggle ("Last 4 weeks" highlighted), "Top tracks" list (10), and "Top artists" list (10) — artists show photo + name + genre line.

- [ ] **Step 2: Switch windows**

Click "Last 6 months". Expected: URL → `/?range=medium_term`, that button now highlighted, both lists change. Click "All time" → `/?range=long_term`, lists change again. Confirm with Will the lists actually differ between windows.

- [ ] **Step 3: Persistence on reload**

With "All time" active, reload. Expected: still All time (URL preserved, button still highlighted).

- [ ] **Step 4: Shareable / direct link**

Navigate directly to `http://127.0.0.1:3000/?range=medium_term`. Expected: opens straight to the 6-month view, "Last 6 months" highlighted.

- [ ] **Step 5: Invalid param**

Navigate to `http://127.0.0.1:3000/?range=banana`. Expected: falls back to Last 4 weeks (highlighted), no crash, data renders.

- [ ] **Step 6: Data sanity**

Track/artist names + genres look like Will's real listening; all photos load (no broken images).

---

## Task 7: PR → self-review → merge → production verify

- [ ] **Step 1: Push**

```bash
git push -u origin pr-5-time-window
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "PR 5 — Time-window toggle + top artists" --body "$(cat <<'EOF'
## Summary
- Add a URL-driven time-window toggle (4 weeks / 6 months / all time) controlling both top tracks and a new top artists list
- Window persists in `?range=` so it survives reload and is shareable
- New `getTopArtists()` + `SpotifyArtist` type; shared `TimeRange` type + `parseTimeRange()`
- Toggle is link-styled (no client state); top artists reuse the tracks list pattern

## Test plan
- [x] Default = last 4 weeks; switching windows updates both lists
- [x] Selection persists on reload and via direct `?range=` link
- [x] Invalid `?range=` falls back to 4 weeks (no crash)
- [x] tsc + lint + build pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: `/code-review`**

Run `/code-review`. Triage with Will (use `/superpowers:receiving-code-review` for any unclear feedback). Fix what matters, push fixes, defer the rest.

- [ ] **Step 4: Merge**

`gh pr merge <PR#> --squash --delete-branch`, then `git checkout main && git pull`.

- [ ] **Step 5: Production verify**

After Vercel deploys `main`, repeat verification steps 1–4 on `https://spotify-wrapped-lemon.vercel.app` (canonical URL, not a preview — preview URLs are behind Vercel SSO). Will may need to log in on production first.

---

## Task 8: Wrap-up + handoff

- [ ] **Step 1: Tick the PR 5 box in `PROGRESS.md`**

Mark the PR 5 line (`- [ ] Branch → brainstorm → ... → handoff`) as `- [x]`.

- [ ] **Step 2: Run `/handoff`**

Writes `docs/handoffs/session-10.md`. The handoff + PROGRESS.md tick + this plan + the spec ride along with the next branch's first commit (main is branch-protected) — note this in the handoff, same pattern as PR 4.

---

## Self-review notes (plan author)

- **Spec coverage:** toggle ✓ (Task 3 + Task 5), URL param + parse ✓ (Task 1 + Task 5), getTopArtists ✓ (Task 1), TopArtists with genre subline ✓ (Task 4), TopTracks heading change ✓ (Task 2), parallel fetch + strict errors ✓ (Task 5), proxy unchanged ✓ (no task touches it — correct), manual verification ✓ (Task 6). Out-of-scope items (skeletons, genre charts, recently-played, KPIs) correctly absent.
- **Type consistency:** `TimeRange` defined Task 1, consumed in `TopTracksOptions`/`TopArtistsOptions` (Task 1), `TimeRangeToggle` (Task 3), `ViewState`/`resolveViewState`/`Home` (Task 5). `SpotifyArtist` defined Task 1, consumed Task 4 + Task 5. `SpotifyApiFailureReason` (from PR 4) reused in `failureState` (Task 5) + `GetTopArtistsResult` (Task 1). `parseTimeRange` defined Task 1, called Task 5. `getTopArtists(accessToken, {limit, timeRange})` signature matches the Task 5 call site.
- **No placeholders:** every code step shows complete code; every command shows expected output.
- **Note:** `failureState` takes the `{ok:false,...}` shape — all three result unions share it, so one helper covers `GetMeResult`, `GetTopTracksResult`, `GetTopArtistsResult` failures.
