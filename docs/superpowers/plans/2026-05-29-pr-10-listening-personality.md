# Listening Personality Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Your Listening Personality" dashboard section that derives two real scores from Spotify data, maps the user to one of four archetypes, and offers a downloadable PNG share card.

**Architecture:** A pure, unit-tested transform (`personality.ts`) computes the scores from top tracks/artists. A `React.cache`-wrapped loader fetches the inputs once per request. A streamed server component renders the card on screen (matching PR 9's per-section Suspense + inline-error pattern). A route handler re-renders the same card as a PNG via Next's `ImageResponse` for download.

**Tech Stack:** Next.js 16.2.6 (App Router, RSC, `next/og`), React 19, Tailwind, shadcn/ui, Vitest.

---

### Task 1: Pure personality transform + tests (TDD)

**Files:**
- Create: `src/lib/personality.ts`
- Test: `src/lib/personality.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/personality.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  computeExplorerPct,
  computeEvolvingPct,
  pickArchetype,
  hasEnoughData,
  computePersonality,
  ARCHETYPES,
} from "@/lib/personality";
import type { SpotifyArtist, SpotifyTrack } from "@/lib/spotify";

// A track whose primary artist is `primaryArtistId` (or no artist if null).
function track(primaryArtistId: string | null): SpotifyTrack {
  return {
    id: "t",
    name: "Track",
    artists: primaryArtistId
      ? [{ id: primaryArtistId, name: primaryArtistId }]
      : [],
    album: { name: "Album", images: [] },
  };
}
function artist(id: string): SpotifyArtist {
  return { id, name: id };
}

describe("computeExplorerPct", () => {
  it("returns 0 for no tracks", () => {
    expect(computeExplorerPct([])).toBe(0);
  });
  it("returns 100 when every track is a different artist", () => {
    expect(
      computeExplorerPct([track("a"), track("b"), track("c"), track("d")]),
    ).toBe(100);
  });
  it("returns 50 when tracks share artists", () => {
    expect(
      computeExplorerPct([track("a"), track("a"), track("b"), track("b")]),
    ).toBe(50);
  });
  it("ignores tracks with no primary artist in the unique count", () => {
    // unique {a, b} = 2 over 4 tracks = 50
    expect(
      computeExplorerPct([track("a"), track(null), track("b"), track("a")]),
    ).toBe(50);
  });
});

describe("computeEvolvingPct", () => {
  it("returns 0 when there are no recent artists", () => {
    expect(computeEvolvingPct([], [artist("a")])).toBe(0);
  });
  it("returns 0 when all recent artists are also all-time", () => {
    const list = [artist("a"), artist("b"), artist("c")];
    expect(computeEvolvingPct(list, list)).toBe(0);
  });
  it("returns 100 when no recent artist is in the all-time list", () => {
    expect(
      computeEvolvingPct([artist("a"), artist("b"), artist("c")], []),
    ).toBe(100);
  });
  it("returns the fraction of recent artists that are new", () => {
    // recent a,b,c,d ; all-time a,b -> new c,d = 2/4 = 50
    expect(
      computeEvolvingPct(
        [artist("a"), artist("b"), artist("c"), artist("d")],
        [artist("a"), artist("b")],
      ),
    ).toBe(50);
  });
});

describe("pickArchetype", () => {
  it("maps the four quadrants", () => {
    expect(pickArchetype(60, 60)).toBe(ARCHETYPES.wanderer);
    expect(pickArchetype(60, 40)).toBe(ARCHETYPES.curator);
    expect(pickArchetype(40, 60)).toBe(ARCHETYPES.phaseShifter);
    expect(pickArchetype(40, 40)).toBe(ARCHETYPES.devotee);
  });
  it("treats exactly 50 as the high side on each axis", () => {
    expect(pickArchetype(50, 50)).toBe(ARCHETYPES.wanderer);
    expect(pickArchetype(49, 50)).toBe(ARCHETYPES.phaseShifter);
    expect(pickArchetype(50, 49)).toBe(ARCHETYPES.curator);
    expect(pickArchetype(49, 49)).toBe(ARCHETYPES.devotee);
  });
});

describe("hasEnoughData", () => {
  const tenTracks = Array.from({ length: 10 }, (_, i) => track(String(i)));
  it("is false with fewer than 10 tracks", () => {
    expect(hasEnoughData([track("a")], [artist("a")], [artist("a")])).toBe(
      false,
    );
  });
  it("is false with no recent artists", () => {
    expect(hasEnoughData(tenTracks, [], [artist("a")])).toBe(false);
  });
  it("is false with no all-time artists", () => {
    expect(hasEnoughData(tenTracks, [artist("a")], [])).toBe(false);
  });
  it("is true with enough of everything", () => {
    expect(hasEnoughData(tenTracks, [artist("a")], [artist("a")])).toBe(true);
  });
});

describe("computePersonality", () => {
  it("combines both scores into an archetype", () => {
    const tracks = [track("a"), track("b"), track("c"), track("d")]; // 100 explorer
    const short = [artist("x"), artist("y")]; // both new vs long -> 100 evolving
    const long = [artist("a")];
    expect(computePersonality(tracks, short, long)).toEqual({
      explorerPct: 100,
      evolvingPct: 100,
      archetype: ARCHETYPES.wanderer,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- personality`
Expected: FAIL — `Cannot find module '@/lib/personality'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/personality.ts`:

```ts
import type { SpotifyArtist, SpotifyTrack } from "@/lib/spotify";

export type ArchetypeKey = "devotee" | "curator" | "phaseShifter" | "wanderer";

export type Archetype = {
  key: ArchetypeKey;
  name: string;
  description: string;
};

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  devotee: {
    key: "devotee",
    name: "The Devotee",
    description: "A handful of artists, and they've been your core for ages.",
  },
  curator: {
    key: "curator",
    name: "The Curator",
    description: "Broad taste that's remarkably steady.",
  },
  phaseShifter: {
    key: "phaseShifter",
    name: "The Phase-Shifter",
    description:
      "You lock onto a few artists hard, then move to the next obsession.",
  },
  wanderer: {
    key: "wanderer",
    name: "The Wanderer",
    description: "Wide open ears, never the same month twice.",
  },
};

export type Personality = {
  explorerPct: number;
  evolvingPct: number;
  archetype: Archetype;
};

const MIN_TRACKS = 10;

/** % of top tracks whose primary artist is distinct. 0 if no tracks. */
export function computeExplorerPct(tracks: SpotifyTrack[]): number {
  if (tracks.length === 0) return 0;
  const artistIds = new Set<string>();
  for (const t of tracks) {
    const primary = t.artists[0]?.id;
    if (primary) artistIds.add(primary);
  }
  return Math.round((100 * artistIds.size) / tracks.length);
}

/** % of recent top artists NOT present in the all-time list. 0 if no recent. */
export function computeEvolvingPct(
  shortTermArtists: SpotifyArtist[],
  longTermArtists: SpotifyArtist[],
): number {
  if (shortTermArtists.length === 0) return 0;
  const longIds = new Set(longTermArtists.map((a) => a.id));
  const newCount = shortTermArtists.filter((a) => !longIds.has(a.id)).length;
  return Math.round((100 * newCount) / shortTermArtists.length);
}

export function pickArchetype(
  explorerPct: number,
  evolvingPct: number,
): Archetype {
  const explorer = explorerPct >= 50;
  const evolving = evolvingPct >= 50;
  if (explorer && evolving) return ARCHETYPES.wanderer;
  if (explorer) return ARCHETYPES.curator;
  if (evolving) return ARCHETYPES.phaseShifter;
  return ARCHETYPES.devotee;
}

export function hasEnoughData(
  tracks: SpotifyTrack[],
  shortTermArtists: SpotifyArtist[],
  longTermArtists: SpotifyArtist[],
): boolean {
  return (
    tracks.length >= MIN_TRACKS &&
    shortTermArtists.length > 0 &&
    longTermArtists.length > 0
  );
}

export function computePersonality(
  tracks: SpotifyTrack[],
  shortTermArtists: SpotifyArtist[],
  longTermArtists: SpotifyArtist[],
): Personality {
  const explorerPct = computeExplorerPct(tracks);
  const evolvingPct = computeEvolvingPct(shortTermArtists, longTermArtists);
  return {
    explorerPct,
    evolvingPct,
    archetype: pickArchetype(explorerPct, evolvingPct),
  };
}

/** Best available artist image URL (Spotify lists largest-first). */
export function artistImageUrl(artist: SpotifyArtist): string | undefined {
  return (
    artist.images?.[2]?.url ??
    artist.images?.[1]?.url ??
    artist.images?.[0]?.url
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- personality`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/personality.ts src/lib/personality.test.ts
git commit -m "feat: add tested listening-personality transform"
```

---

### Task 2: Cached personality loader

**Files:**
- Modify: `src/lib/loaders.ts`

- [ ] **Step 1: Add the loader**

Append to `src/lib/loaders.ts` (and extend the top import from `@/lib/spotify` to also import `type SpotifyArtist`):

```ts
import {
  computePersonality,
  hasEnoughData,
  type Personality,
} from "@/lib/personality";

export type PersonalityLoad =
  | { ok: false }
  | { ok: true; enough: false }
  | {
      ok: true;
      enough: true;
      personality: Personality;
      topArtists: SpotifyArtist[];
    };

// Personality is window-independent: explorer score from all-time top tracks,
// evolving score from recent-vs-all-time top artists. Three Spotify calls,
// memoized per request by the (primitive) access token.
export const loadPersonality = cache(
  async (accessToken: string): Promise<PersonalityLoad> => {
    const [tracksRes, shortRes, longRes] = await Promise.all([
      getTopTracks(accessToken, { limit: 50, timeRange: "long_term" }),
      getTopArtists(accessToken, { limit: 50, timeRange: "short_term" }),
      getTopArtists(accessToken, { limit: 50, timeRange: "long_term" }),
    ]);
    if (!tracksRes.ok || !shortRes.ok || !longRes.ok) return { ok: false };

    const { tracks } = tracksRes;
    const shortArtists = shortRes.artists;
    const longArtists = longRes.artists;

    if (!hasEnoughData(tracks, shortArtists, longArtists)) {
      return { ok: true, enough: false };
    }
    return {
      ok: true,
      enough: true,
      personality: computePersonality(tracks, shortArtists, longArtists),
      topArtists: longArtists.slice(0, 3),
    };
  },
);
```

Make sure the existing top-of-file import reads:

```ts
import {
  getRecentlyPlayed,
  getTopArtists,
  getTopTracks,
  type SpotifyArtist,
  type TimeRange,
} from "@/lib/spotify";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/loaders.ts
git commit -m "feat: add cached personality loader"
```

---

### Task 3: On-screen personality card component

**Files:**
- Create: `src/components/personality-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { artistImageUrl, type Personality } from "@/lib/personality";
import type { SpotifyArtist } from "@/lib/spotify";

export function PersonalityCard({
  personality,
  topArtists,
}: {
  personality: Personality;
  topArtists: SpotifyArtist[];
}) {
  const { archetype, explorerPct, evolvingPct } = personality;
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-b from-emerald-950 to-black p-6 text-white">
      <p className="text-[11px] tracking-[0.2em] text-white/60 uppercase">
        Listening Personality
      </p>
      <h2 className="mt-1 text-2xl font-bold">{archetype.name}</h2>
      <p className="mt-1 text-sm text-white/80">{archetype.description}</p>

      <div className="mt-4 flex gap-2">
        <PersonalityStat label="Explorer" value={explorerPct} />
        <PersonalityStat label="Evolving" value={evolvingPct} />
      </div>

      <p className="mt-4 text-[10px] tracking-wider text-white/60 uppercase">
        Built from your top artists
      </p>
      <div className="mt-2 flex items-center gap-2">
        {topArtists.map((a) => {
          const url = artistImageUrl(a);
          return url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={a.id}
              src={url}
              alt={a.name}
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <span
              key={a.id}
              className="flex size-9 items-center justify-center rounded-full bg-emerald-500/30 text-sm font-medium"
            >
              {a.name.charAt(0)}
            </span>
          );
        })}
        <span className="truncate text-xs text-white/80">
          {topArtists.map((a) => a.name).join(", ")}
        </span>
      </div>

      <p className="mt-4 text-[10px] text-white/50">
        spotify-wrapped-lemon.vercel.app
      </p>
    </div>
  );
}

function PersonalityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-lg bg-white/10 p-2.5">
      <div className="text-xl font-bold text-emerald-400">{value}%</div>
      <div className="text-[10px] text-white/70">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/personality-card.tsx
git commit -m "feat: add on-screen personality card"
```

---

### Task 4: Personality skeleton + streamed section

**Files:**
- Modify: `src/components/sections/section-ui.tsx`
- Create: `src/components/sections/personality-section.tsx`

- [ ] **Step 1: Add a skeleton to `section-ui.tsx`**

Append to `src/components/sections/section-ui.tsx`:

```tsx
export function PersonalityCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border p-6">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-14 flex-1 rounded-lg" />
        <Skeleton className="h-14 flex-1 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="size-9 rounded-full" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the section component**

Create `src/components/sections/personality-section.tsx`:

```tsx
import { loadPersonality } from "@/lib/loaders";
import { PersonalityCard } from "@/components/personality-card";
import { SectionError } from "@/components/sections/section-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TITLE = "Your listening personality";

export async function PersonalitySection({
  accessToken,
}: {
  accessToken: string;
}) {
  const result = await loadPersonality(accessToken);

  if (!result.ok) return <SectionError title={TITLE} />;

  if (!result.enough) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{TITLE}</h2>
        <p className="text-sm text-muted-foreground">
          Not enough listening history yet to read your personality. Come back
          after you&rsquo;ve listened to more on Spotify.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PersonalityCard
        personality={result.personality}
        topArtists={result.topArtists}
      />
      <a
        href="/api/personality/card"
        className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
      >
        Save image
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/section-ui.tsx src/components/sections/personality-section.tsx
git commit -m "feat: add streamed personality section with skeleton and states"
```

---

### Task 5: Wire the section into the dashboard

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports**

In `src/app/page.tsx`, add to the imports:

```tsx
import { PersonalitySection } from "@/components/sections/personality-section";
```

And extend the existing `section-ui` import to include the skeleton:

```tsx
import {
  HeadlineStatsSkeleton,
  ListSkeleton,
  PersonalityCardSkeleton,
} from "@/components/sections/section-ui";
```

- [ ] **Step 2: Insert the section as the hero (window-independent, above the toggle)**

In the logged-in `body`, place the personality block between `<NowPlaying />` and `<TimeRangeToggle ... />`:

```tsx
body = (
  <>
    <NowPlaying />
    <Suspense fallback={<PersonalityCardSkeleton />}>
      <PersonalitySection accessToken={token} />
    </Suspense>
    <TimeRangeToggle current={timeRange} />
    <Suspense fallback={<HeadlineStatsSkeleton />}>
      <HeadlineStatsSection accessToken={token} timeRange={timeRange} />
    </Suspense>
    <Suspense fallback={<ListSkeleton title="Top tracks" />}>
      <TopTracksSection accessToken={token} timeRange={timeRange} />
    </Suspense>
    <Suspense fallback={<ListSkeleton title="Top artists" />}>
      <TopArtistsSection accessToken={token} timeRange={timeRange} />
    </Suspense>
    <Suspense fallback={<ListSkeleton title="Recently played" />}>
      <RecentlyPlayedSection accessToken={token} />
    </Suspense>
    <LogoutButton />
  </>
);
```

- [ ] **Step 3: Verify it renders**

Run: `npm run dev` (already running is fine). In the browser, log in and confirm the personality card appears below "now playing" with an archetype, two percentages, and your top-artist avatars + a "Save image" button. The skeleton should flash while loading.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: surface personality section on the dashboard"
```

---

### Task 6: PNG share-card route

**Files:**
- Create: `src/app/api/personality/card/route.tsx`

- [ ] **Step 1: Create the route handler**

Create `src/app/api/personality/card/route.tsx`. Note: `next/og` `ImageResponse` supports **flexbox only** (no CSS grid), so every container uses `display: "flex"`; remote images are fetched to base64 data URLs (Satori can't load by URL reliably), with a per-image fallback to an initial circle.

```tsx
import { ImageResponse } from "next/og";
import { getSession } from "@/lib/spotify";
import { loadPersonality } from "@/lib/loaders";
import { artistImageUrl } from "@/lib/personality";

async function toDataUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const result = await loadPersonality(session.accessToken);
  if (!result.ok || !result.enough) {
    return new Response("Personality unavailable", { status: 404 });
  }

  const { personality, topArtists } = result;
  const avatars = await Promise.all(
    topArtists.map(async (a) => ({
      name: a.name,
      dataUrl: await toDataUrl(artistImageUrl(a)),
    })),
  );
  const names = avatars.map((a) => a.name).join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #0b3d2e, #0a0a0a 70%)",
          color: "white",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{ fontSize: 28, letterSpacing: 6, color: "rgba(255,255,255,0.6)" }}
          >
            LISTENING PERSONALITY
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, marginTop: 16 }}>
            {personality.archetype.name}
          </div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.8)", marginTop: 8 }}>
            {personality.archetype.description}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 28,
            }}
          >
            <div style={{ fontSize: 64, fontWeight: 700, color: "#1DB954" }}>
              {personality.explorerPct}%
            </div>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
              Explorer
            </div>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 28,
            }}
          >
            <div style={{ fontSize: 64, fontWeight: 700, color: "#1DB954" }}>
              {personality.evolvingPct}%
            </div>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
              Evolving
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{ fontSize: 24, letterSpacing: 4, color: "rgba(255,255,255,0.6)" }}
          >
            BUILT FROM YOUR TOP ARTISTS
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}
          >
            {avatars.map((a, i) =>
              a.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={a.dataUrl}
                  width={96}
                  height={96}
                  style={{ borderRadius: 9999 }}
                  alt=""
                />
              ) : (
                <div
                  key={i}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 9999,
                    background: "rgba(29,185,84,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                    fontWeight: 600,
                  }}
                >
                  {a.name.charAt(0)}
                </div>
              ),
            )}
            <div style={{ fontSize: 28, color: "rgba(255,255,255,0.8)" }}>
              {names}
            </div>
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)", marginTop: 32 }}>
            spotify-wrapped-lemon.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1000,
      height: 1250,
      headers: {
        "Content-Disposition":
          'attachment; filename="listening-personality.png"',
      },
    },
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Verify the image generates**

With the dev server running and logged in, visit `http://127.0.0.1:3000/api/personality/card` in the browser. Expected: a PNG downloads named `listening-personality.png` showing the archetype, both percentages, and the three avatars. Open it and confirm it matches the on-screen card's content.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/personality/card/route.tsx
git commit -m "feat: add downloadable personality PNG via next/og"
```

---

### Task 7: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Tests**

Run: `npm test`
Expected: all suites pass, including `personality`.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Production build (catches `next/og` / route issues `tsc` misses)**

Run: `npm run build`
Expected: build succeeds; `/api/personality/card` listed as a route.

- [ ] **Step 4: Browser verification (Claude in Chrome)**

Logged in, confirm in order:
1. Personality card renders with an archetype matching the displayed percentages (explorer ≥50 → "Explorer/Curator/Wanderer" side; check the quadrant logic against the two numbers).
2. Top-artist avatars show (or initial-circle fallbacks if an artist has no image).
3. "Save image" downloads a PNG that matches the card.
4. Force a failure (e.g. temporarily break the loader URL) → the section shows the inline "Couldn't load" error and the rest of the dashboard still renders. Revert the change.

- [ ] **Step 5: No commit** — verification only. If fixes were needed, commit those under their own message.

---

## Post-merge (not code — separate manual step)

After the PR merges and deploys, walk Will through submitting the Spotify app for **Extended Quota Mode** on the developer dashboard. This lets non-approved users log in and unblocks the parked PR 7 (genre breakdown). Add testers as approved users in the meantime.

## Self-review notes

- **Spec coverage:** both axes (Task 1), 2×2 mapping (Task 1 `pickArchetype`), not-enough-data state (Task 1 `hasEnoughData` + Task 4 message), card design C with avatars + fallback (Tasks 3 & 6), cached loader with primitive arg (Task 2), streamed section + inline error (Task 4), page wiring (Task 5), downloadable PNG (Task 6), full verification incl. build (Task 7), Extended Quota called out as a separate manual step. All covered.
- **Type consistency:** `Personality`, `Archetype`, `ArchetypeKey`, `PersonalityLoad`, `artistImageUrl`, `loadPersonality` names are used identically across tasks. `ARCHETYPES` keys (`devotee`/`curator`/`phaseShifter`/`wanderer`) are consistent between the module and the tests.
- **Next 16 specifics:** `ImageResponse` from `next/og`; flexbox-only layout; remote images fetched to data URLs — all verified against `node_modules/next/dist/docs/.../image-response.md`.
```
