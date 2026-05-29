# Headline KPI Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a row of three honest, text-only headline stat cards (top artist, top track, recent listening) near the top of the dashboard.

**Architecture:** A pure, tested transform (`src/lib/listening.ts`) computes the "recent listening" numbers from the recently-played feed. A presentational component (`HeadlineStats`) renders three shadcn `<Card>`s from plain props. The page (`page.tsx`) fetches 50 recent plays instead of 10, derives the props, and renders the row below the time-range toggle.

**Tech Stack:** Next.js 16 (App Router, server components), TypeScript, Tailwind v4, shadcn/ui, Vitest.

Spec: `docs/superpowers/specs/2026-05-29-pr-8-kpi-cards-design.md`

---

## File Structure

- **Create** `vitest.config.ts` — Vitest config (node env, `@` alias). Re-added to `main`.
- **Modify** `package.json` — add `vitest` dev dep + `"test": "vitest run"` script.
- **Modify** `src/lib/spotify.ts` — add optional `duration_ms` to `SpotifyTrack`.
- **Create** `src/lib/listening.ts` — pure `summarizeRecentListening` + `formatListeningTime`.
- **Create** `src/lib/listening.test.ts` — Vitest tests for the above.
- **Create** `src/components/headline-stats.tsx` — presentational 3-card row.
- **Modify** `src/app/page.tsx` — fetch 50 recent plays, derive props, render `<HeadlineStats>`, slice list to 10.

---

## Task 1: Re-add Vitest test runner

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^4.1.7`
Expected: installs, `vitest` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json`, add to the `"scripts"` object (after `"lint"`):

```json
    "lint": "eslint",
    "test": "vitest run"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: re-add Vitest test runner"
```

---

## Task 2: Add `duration_ms` to the track type

**Files:**
- Modify: `src/lib/spotify.ts` (the `SpotifyTrack` type, ~line 63)

- [ ] **Step 1: Add the optional field**

In `src/lib/spotify.ts`, update the `SpotifyTrack` type to add `duration_ms` as **optional** (defensive — Spotify's docs say it's always present, but our standing rule is never to trust the shape):

```ts
export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  // Track length in milliseconds. Optional + read defensively (default 0)
  // because the live API has omitted documented fields before.
  duration_ms?: number;
};
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/spotify.ts
git commit -m "feat: add optional duration_ms to SpotifyTrack"
```

---

## Task 3: Build the tested listening transform (TDD)

**Files:**
- Create: `src/lib/listening.test.ts`
- Create: `src/lib/listening.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/listening.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  summarizeRecentListening,
  formatListeningTime,
} from "@/lib/listening";
import type { RecentlyPlayedItem } from "@/lib/spotify";

// Minimal RecentlyPlayedItem factory for tests.
function item(durationMs: number | undefined): RecentlyPlayedItem {
  return {
    track: {
      id: "t",
      name: "Track",
      artists: [{ id: "a", name: "Artist" }],
      album: { name: "Album", images: [] },
      duration_ms: durationMs,
    },
    playedAt: "2026-05-29T00:00:00.000Z",
  };
}

describe("summarizeRecentListening", () => {
  it("returns zeros for an empty list", () => {
    expect(summarizeRecentListening([])).toEqual({ totalMs: 0, trackCount: 0 });
  });

  it("sums durations and counts tracks", () => {
    const result = summarizeRecentListening([item(200000), item(220000)]);
    expect(result).toEqual({ totalMs: 420000, trackCount: 2 });
  });

  it("treats a missing duration as 0 but still counts the track", () => {
    const result = summarizeRecentListening([item(200000), item(undefined)]);
    expect(result).toEqual({ totalMs: 200000, trackCount: 2 });
  });
});

describe("formatListeningTime", () => {
  it("formats zero as ~0m", () => {
    expect(formatListeningTime(0)).toBe("~0m");
  });

  it("formats a sub-hour total as minutes only", () => {
    expect(formatListeningTime(720000)).toBe("~12m"); // 12 min
  });

  it("formats a multi-hour total as hours and minutes", () => {
    expect(formatListeningTime(11520000)).toBe("~3h 12m"); // 192 min
  });

  it("rounds to the nearest minute", () => {
    expect(formatListeningTime(90000)).toBe("~2m"); // 1.5 min rounds to 2
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/listening` (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/listening.ts`:

```ts
import type { RecentlyPlayedItem } from "@/lib/spotify";

export type RecentListeningSummary = {
  totalMs: number;
  trackCount: number;
};

/**
 * Sum the durations and count the plays in a recently-played list.
 * Pure — no I/O. A track missing `duration_ms` contributes 0 but is
 * still counted, so the count stays an honest play count.
 */
export function summarizeRecentListening(
  items: RecentlyPlayedItem[],
): RecentListeningSummary {
  let totalMs = 0;
  for (const item of items) {
    totalMs += item.track.duration_ms ?? 0;
  }
  return { totalMs, trackCount: items.length };
}

/**
 * Format a millisecond total as an approximate human duration, e.g.
 * "~3h 12m" or "~12m". The leading "~" signals this is an estimate from
 * a capped recent-plays sample, not an exact all-time figure.
 */
export function formatListeningTime(totalMs: number): string {
  const totalMinutes = Math.round(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `~${hours}h ${minutes}m`;
  return `~${minutes}m`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/listening.ts src/lib/listening.test.ts
git commit -m "feat: add tested recent-listening summary transform"
```

---

## Task 4: Build the HeadlineStats component

**Files:**
- Create: `src/components/headline-stats.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/headline-stats.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";

type HeadlineStatsProps = {
  topArtist: string | null;
  topTrack: string | null;
  recentTimeLabel: string;
  recentCount: number;
};

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card size="sm" className="justify-center">
      <CardContent className="space-y-0.5">
        <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function HeadlineStats({
  topArtist,
  topTrack,
  recentTimeLabel,
  recentCount,
}: HeadlineStatsProps) {
  const hasRecent = recentCount > 0;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Stat label="Top artist" value={topArtist ?? "—"} sub="this window" />
      <Stat label="Top track" value={topTrack ?? "—"} sub="this window" />
      <Stat
        label="Lately"
        value={hasRecent ? recentTimeLabel : "—"}
        sub={hasRecent ? `${recentCount} tracks` : "no recent plays"}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/headline-stats.tsx
git commit -m "feat: add HeadlineStats presentational component"
```

---

## Task 5: Wire HeadlineStats into the dashboard

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports**

In `src/app/page.tsx`, add to the import block:

```ts
import { HeadlineStats } from "@/components/headline-stats";
import {
  formatListeningTime,
  summarizeRecentListening,
} from "@/lib/listening";
```

- [ ] **Step 2: Extend the logged-in view state**

In the `ViewState` type, add four fields to the `logged-in` variant:

```ts
  | {
      kind: "logged-in";
      displayName: string;
      timeRange: TimeRange;
      tracks: SpotifyTrack[];
      artists: SpotifyArtist[];
      recentlyPlayed: RecentlyPlayedItem[];
      topArtist: string | null;
      topTrack: string | null;
      recentTimeLabel: string;
      recentCount: number;
    }
```

- [ ] **Step 3: Fetch 50 recent plays and derive the props**

In `resolveViewState`, change the recently-played fetch limit from 10 to 50:

```ts
      getRecentlyPlayed(session.accessToken, { limit: 50 }),
```

Then replace the success-branch `return` with one that computes the summary, slices the list back to 10 for display, and adds the four new fields:

```ts
  const recentSummary = summarizeRecentListening(recentResult.items);

  return {
    kind: "logged-in",
    // display_name can be null (rare). Fall back to the user's Spotify ID.
    displayName: meResult.profile.display_name ?? meResult.profile.id,
    timeRange,
    tracks: tracksResult.tracks,
    artists: artistsResult.artists,
    // KPI "Lately" uses all 50; the list below shows only the first 10.
    recentlyPlayed: recentResult.items.slice(0, 10),
    topArtist: artistsResult.artists[0]?.name ?? null,
    topTrack: tracksResult.tracks[0]?.name ?? null,
    recentTimeLabel: formatListeningTime(recentSummary.totalMs),
    recentCount: recentSummary.trackCount,
  };
```

- [ ] **Step 4: Render the row below the toggle**

In the `logged-in` render block, insert `<HeadlineStats>` between `<TimeRangeToggle>` and `<TopTracks>`:

```tsx
              <NowPlaying />
              <TimeRangeToggle current={view.timeRange} />
              <HeadlineStats
                topArtist={view.topArtist}
                topTrack={view.topTrack}
                recentTimeLabel={view.recentTimeLabel}
                recentCount={view.recentCount}
              />
              <TopTracks tracks={view.tracks} />
              <TopArtists artists={view.artists} />
              <RecentlyPlayed items={view.recentlyPlayed} />
```

- [ ] **Step 5: Verify it typechecks and tests still pass**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all listening tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: render headline KPI cards on the dashboard"
```

---

## Task 6: Verify in the browser (Explain-Show-Test)

**No code — manual verification with Will.**

- [ ] **Step 1: Build to catch any production-only errors**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Open `http://127.0.0.1:3000` in Chrome.

- [ ] **Step 3: Verify against the spec (screenshot via Claude in Chrome)**

- Three cards render in a row: Top artist, Top track, Lately.
- Top artist / Top track show real values; `Lately` shows `~Xh Ym` + `N tracks`.
- Flip the time-range toggle: Top artist + Top track update; `Lately` stays put.
- Narrow the viewport: the three cards stack into one column cleanly.
- Top Tracks / Top Artists / Recently Played below are unchanged (Recently Played still shows 10).

- [ ] **Step 4: Edge-case sanity check**

- Confirm long track/artist names truncate (don't overflow the card).
- If feasible, reason through the empty-recent case ("no recent plays" copy).

---

## Self-Review notes

- **Spec coverage:** three cards (Tasks 4–5), honest "Lately" with minutes+count (Tasks 3–5), text-only compact row that stacks on phones (Task 4), placement below toggle (Task 5), `duration_ms` defensive read (Tasks 2–3), Vitest re-added (Task 1), edge cases (Tasks 3–4), verification plan (Task 6). All covered.
- **Type consistency:** `summarizeRecentListening` / `formatListeningTime` / `RecentListeningSummary` and the `HeadlineStats` props (`topArtist`, `topTrack`, `recentTimeLabel`, `recentCount`) are used identically across Tasks 3, 4, and 5.
- **No placeholders:** every code step shows the full code; every run step shows the command + expected result.
