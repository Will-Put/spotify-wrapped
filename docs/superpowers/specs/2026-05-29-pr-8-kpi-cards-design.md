# PR 8 — Headline KPI cards (design spec)

**Date:** 2026-05-29
**Branch:** `pr-8-kpi-cards`
**Status:** Approved design, ready for implementation plan

## Goal

Add a row of three compact, text-only "headline" stat cards near the top of the
dashboard, summarizing the listening data we already have. This is the PR 8
lesson: **frame imperfect/estimated data honestly — don't claim precision the
API can't give us.**

## The data reality (why the cards are what they are)

The roadmap originally suggested "total tracks listened, estimated listening
time, top genre." All three are problematic with the data Spotify serves this
app:

- **Total tracks listened** — Spotify exposes no lifetime total. The top-tracks
  endpoint returns a *ranked list*, not play counts or a grand total. No honest
  number exists. **Dropped.**
- **Top genre** — genres are not served in Development Mode (the exact wall PR 7
  hit; see `project_spotify-genre-data-unavailable` in memory). Blocked until
  Extended Quota (PR 10). **Dropped.**
- **Estimated listening time** — no play counts exist anywhere we can fetch. The
  only honest version is summing durations of the **recently-played** feed
  (last ~50 plays, roughly the last few days). Kept, but scoped and labeled as
  *recent*, not all-time.

## The three cards

A compact row of three text-only stat cards (big value + small uppercase label,
no images):

| Card | Label | Value | Source |
|---|---|---|---|
| Top artist | `TOP ARTIST` | e.g. `Drake` | `artists[0]` of the already-fetched top artists, **window-dependent** |
| Top track | `TOP TRACK` | e.g. `Passionfruit` | `tracks[0]` of the already-fetched top tracks, **window-dependent** |
| Lately | `LATELY` | e.g. `~3h 12m` + `50 tracks` | summed durations + count of the last 50 recently-played plays, **window-independent** |

## Layout & placement

- Three cards in a row inside the existing narrow dashboard card (`max-w-md`).
  Compact: big value, tiny uppercase muted label. **No artist photos** — those
  already appear in the Top Artists list below; KPIs stay text-only to fit the
  width and avoid duplication.
- Responsive: single column on narrow/phone widths, three-across when there's
  room (`grid-cols-1` → `grid-cols-3` at a breakpoint).
- Page order becomes:
  `NowPlaying → TimeRangeToggle → HeadlineStats → TopTracks → TopArtists → RecentlyPlayed`.
  The toggle sits **above** the KPI row so flipping the window visibly updates
  "Top artist" and "Top track" right beneath it.

## Window behavior (and the one honest inconsistency)

- "Top artist" and "Top track" reflect the selected time window (4 weeks /
  6 months / all time) — they change when the toggle changes.
- "Lately" is **always** the last ~50 plays; Spotify has no time-window variant
  of recently-played. So when the user toggles, two cards update and one stays
  put. The `LATELY` label (plus "lately"/"recent" wording) makes this read as
  intentional, not broken.

## Data plumbing

- **Top artist / track:** no new API calls — read `[0]` from lists already
  fetched in `resolveViewState`.
- **Lately:** bump the existing recently-played fetch from `limit: 10` to
  `limit: 50` (still one call). Use all 50 for the sum/count; pass
  `items.slice(0, 10)` to the existing Recently Played list so its display is
  unchanged. No extra fetch.
- **New field:** add `duration_ms: number` to the `SpotifyTrack` type. Read
  defensively — if Spotify omits it on a track, treat as `0` (per the standing
  rule: never trust the documented response shape; verify with real data). The
  track still counts toward `trackCount`.

## Components & files

- **`src/lib/listening.ts`** (new) — pure logic, no I/O:
  - `summarizeRecentListening(items: RecentlyPlayedItem[]) => { totalMs: number; trackCount: number }`
  - `formatListeningTime(totalMs: number) => string` — e.g. `~3h 12m`, `~12m`,
    `~0m` for empty. Leading `~` signals *estimate*.
- **`src/lib/listening.test.ts`** (new) — Vitest tests (see Testing).
- **`src/components/headline-stats.tsx`** (new) — presentational. Props are
  plain values, no Spotify types leaking in:
  `{ topArtist: string | null; topTrack: string | null; recentTimeLabel: string; recentCount: number }`.
  Renders three shadcn `<Card>`s. Missing artist/track → `—`. Empty recent →
  "no recent plays".
- **`src/app/page.tsx`** (edit) — in `resolveViewState`: bump recently-played
  limit to 50, compute the summary via `summarizeRecentListening`, derive the
  four plain props, add them to the `logged-in` view state. In the render: drop
  `<HeadlineStats>` in below the toggle; slice the recently-played list to 10.
- **`vitest.config.ts`** + **`package.json`** (edit) — re-add the Vitest dev
  dependency, config, and `test` script. Copy the working setup from the
  `pr-7-genre-breakdown` branch (it was proven there but never reached `main`).

## Testing

Vitest, test-first where practical, covering the pure transform + formatter:

- `summarizeRecentListening`:
  - empty list → `{ totalMs: 0, trackCount: 0 }`
  - normal list → correct sum of `duration_ms` and correct count
  - a track with missing `duration_ms` → contributes 0 but still counted
- `formatListeningTime`:
  - `0` → `~0m`
  - sub-hour (e.g. 12 min) → `~12m`
  - multi-hour (e.g. 3h 12m) → `~3h 12m`
  - rounding behavior at minute boundaries is explicit (round to nearest minute)

No component-level tests — the component is presentational and verified
visually in Chrome (Explain-Show-Test loop).

## Edge cases

- New account with no top artist/track → cards render `—`, never crash.
- Empty recently-played → "Lately: no recent plays" (no `~0m` shown).
- `duration_ms` absent on some tracks → those count as 0 duration, still tallied.
- All existing failure states (expired / spotify-down) are unchanged — KPIs only
  render inside the existing `logged-in` branch.

## Explicitly NOT in scope

- No "total tracks listened" KPI (no honest source).
- No "top genre" KPI (blocked until Extended Quota / PR 10).
- No artist/album images in the KPI cards.
- No new chart or data-viz library.
- No changes to auth, now-playing, or the time-range toggle's own behavior.

## Verification plan

1. `npm test` — Vitest green.
2. Dev server + Chrome (Explain-Show-Test):
   - Cards render with real values for the logged-in user.
   - Toggling the time window updates Top artist / Top track; Lately stays put.
   - Lately shows a believable `~Xh Ym · N tracks`.
   - Narrow viewport: cards stack to one column cleanly.
3. Confirm no regression in Top Tracks / Top Artists / Recently Played.
