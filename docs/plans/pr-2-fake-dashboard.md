# PR 2 Implementation Plan — Fake Spotify Wrapped Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, deployed Spotify-Wrapped-style dashboard at `/dashboard` populated with Will's real music taste and fake numbers — five cards arranged as a hero on top + a 2×2 grid, styled in a disciplined burnt-orange palette.

**Architecture:** New Next.js route at `src/app/dashboard/page.tsx` composing five card components under `src/components/dashboard/`. Each card is a thin wrapper around the shadcn `<Card>` primitive with palette-specific inline styles. All fake data lives in a single typed file at `src/lib/fake-spotify-data.ts`. The PR 1 mood board at `/` is unchanged — PR 2 is purely additive.

**Tech Stack:** Next.js 16.2.6 · React 19.2.4 · Tailwind 4 · shadcn 4.x (Base UI) · TypeScript

**Verification model:** No automated tests in this PR (per `CLAUDE.md`, tests start in PR 3). Verification is visual via Claude in Chrome screenshots at **desktop (1440px)** and **mobile (~390px)**, plus a Lighthouse accessibility audit targeting score ≥ 90.

**Spec:** `docs/superpowers/specs/2026-05-27-pr-2-fake-dashboard-design.md`

---

## File structure

| Path | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Edit | Add four `--orange-*` palette tokens after the existing `--kett-*` block in `:root` |
| `src/lib/fake-spotify-data.ts` | New | Typed exports of all fake data (artists, tracks, genres, totals, personality). Single source of truth. |
| `src/app/dashboard/page.tsx` | New | The `/dashboard` route. Thin composition file: imports + grid wrapper + 5 cards. Owns the dark page background. |
| `src/components/dashboard/HeroCard.tsx` | New | Full-width hero. Gradient `flame → deep`, giant total-minutes number. |
| `src/components/dashboard/TopArtistsCard.tsx` | New | Solid `deep` bg, ranked list of 5 artists with genre badges. |
| `src/components/dashboard/TopTracksCard.tsx` | New | Solid `cream` bg, ranked list of 5 tracks. Inverse rhythm vs Artists. |
| `src/components/dashboard/GenreCard.tsx` | New | Solid `flame` bg, House/Country/Rap percentages with horizontal bars. |
| `src/components/dashboard/PersonalityCard.tsx` | New | Gradient `deep → flame` (rotated from hero), italic "House Horse" label, mono tagline. |
| `PROGRESS.md` | Edit (at end) | Tick PR 2 checkboxes |
| `docs/handoffs/session-4.md` | New (at end) | Session handoff for next session |

Total: 1 edit (`globals.css`), 7 new component/data files, 2 end-of-PR housekeeping files.

---

## Task 1: Foundation — palette tokens + fake data file

**Why this is first:** The palette tokens and data file are referenced by every component. Defining them once at the root means each card just imports + references, without copying values around. No visible UI changes yet — this task only proves the foundations don't break the existing build.

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/fake-spotify-data.ts`

### Steps

- [ ] **Step 1.1:** Edit `src/app/globals.css` — append the burnt-orange palette tokens at the end of the existing `:root` block, immediately after the `--kett-blue: #3D8BFF;` line. The block becomes:

```css
  /* KETTAMA palette — cold/electric */
  --kett-black: #0A0A0F;
  --kett-acid: #9FFF3D;
  --kett-text: #F0F0F2;
  --kett-blue: #3D8BFF;

  /* PR 2 burnt-orange signature palette */
  --orange-flame: #FF4500;
  --orange-deep:  #1A0500;
  --orange-cream: #FFE8D6;
  --orange-mid:   #C2360F;
}
```

(Note: only the closing `}` at the end belongs to `:root` — don't add an extra one.)

- [ ] **Step 1.2:** Create `src/lib/fake-spotify-data.ts` with the typed data. Full contents:

```ts
// Fake Spotify-Wrapped-style data for the /dashboard playground page.
// Single source of truth — components import from here, never hardcode their own copies.

export type Artist = {
  rank: number;
  name: string;
  genre: string;
  minutes: number;
};

export type Track = {
  rank: number;
  title: string;
  artist: string;
};

export type GenreSplit = {
  name: string;
  percent: number;
};

export type Personality = {
  label: string;
  tagline: string;
};

export const TOTAL_MINUTES = 47283;

export const TOP_ARTISTS: Artist[] = [
  { rank: 1, name: "Treaty Oak Revival", genre: "country",           minutes: 4892 },
  { rank: 2, name: "KETTAMA",            genre: "house",             minutes: 4201 },
  { rank: 3, name: "John Summit",        genre: "house",             minutes: 3847 },
  { rank: 4, name: "Slightly Stoopid",   genre: "reggae rock",       minutes: 2103 },
  { rank: 5, name: "Eric Prydz",         genre: "progressive house", minutes: 1956 },
];

export const TOP_TRACKS: Track[] = [
  { rank: 1, title: "Whole Lotta Lovin'", artist: "Treaty Oak Revival" },
  { rank: 2, title: "Where You Are",      artist: "John Summit, HAYLA" },
  { rank: 3, title: "Opus",               artist: "Eric Prydz" },
  { rank: 4, title: "Last Time",          artist: "KETTAMA" },
  { rank: 5, title: "Closer to the Sun",  artist: "Slightly Stoopid" },
];

export const GENRES: GenreSplit[] = [
  { name: "House",   percent: 62 },
  { name: "Country", percent: 24 },
  { name: "Rap",     percent: 14 },
];

export const PERSONALITY: Personality = {
  label: "House Horse",
  tagline:
    "Half stallion, half subwoofer. Built for back roads and basslines, equally at home in a Galway warehouse and on a back porch at last call.",
};
```

- [ ] **Step 1.3:** Start the dev server and verify nothing broke.

```bash
npm run dev
```

Expected: Server boots cleanly on `http://localhost:3000`. The PR 1 mood board still renders at `/` (we haven't touched anything that affects it). `http://localhost:3000/dashboard` returns Next.js's default 404 page (the route doesn't exist yet — that's expected).

- [ ] **Step 1.4:** Commit.

```bash
git add src/app/globals.css src/lib/fake-spotify-data.ts
git commit -m "Add burnt-orange palette tokens and fake Spotify data"
```

---

## Task 2: Dashboard route scaffold

**Why this is its own task:** Creating the route file by itself (with no cards yet) confirms the `/dashboard` URL resolves. Each subsequent task slots a card into this scaffold. Decoupling the route from the cards means we can verify routing independently of card styling.

**Files:**
- Create: `src/app/dashboard/page.tsx`

### Steps

- [ ] **Step 2.1:** Create the directory.

```bash
mkdir -p src/app/dashboard
```

- [ ] **Step 2.2:** Create `src/app/dashboard/page.tsx` with the route scaffold — the page wrapper, grid container, and a temporary placeholder. Full contents:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Spotify Wrapped",
  description: "A fake Spotify Wrapped poster — playground PR 2.",
};

export default function DashboardPage() {
  return (
    <main
      className="min-h-dvh w-full"
      style={{ backgroundColor: "#000", color: "var(--orange-cream)" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card slots go here. Hero spans both columns; the next four cards
              fill the 2×2 grid in order: Artists, Tracks, Genres, Personality. */}
          <div
            className="lg:col-span-2 rounded-xl border border-dashed p-12 text-center text-sm uppercase tracking-widest opacity-60"
            style={{
              borderColor: "var(--orange-flame)",
              fontFamily: "var(--font-jetbrains)",
            }}
          >
            Dashboard scaffold · cards coming
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2.3:** Save, watch dev server hot-reload, open `http://localhost:3000/dashboard` in Chrome.

Use Claude in Chrome to screenshot. Verify:
- Page resolves at `/dashboard` (no 404)
- Black background fills the viewport
- One dashed-border placeholder box reading `DASHBOARD SCAFFOLD · CARDS COMING` in orange
- Browser tab title reads `Dashboard | Spotify Wrapped`
- No console errors
- `/` still renders the PR 1 mood board unchanged

- [ ] **Step 2.4:** Commit.

```bash
git add src/app/dashboard/page.tsx
git commit -m "Add /dashboard route scaffold (placeholder, no cards yet)"
```

---

## Task 3: HeroCard

**What this adds:** The wide hero card across the top of the grid. Sets the visual tone for the page — gradient, big tabular-number typography, "Your 2026 in Sound" framing.

**Files:**
- Create: `src/components/dashboard/HeroCard.tsx`
- Modify: `src/app/dashboard/page.tsx`

### Steps

- [ ] **Step 3.1:** Create the directory.

```bash
mkdir -p src/components/dashboard
```

- [ ] **Step 3.2:** Create `src/components/dashboard/HeroCard.tsx`. Full contents:

```tsx
import { Card } from "@/components/ui/card";
import { TOTAL_MINUTES } from "@/lib/fake-spotify-data";

const HOURS = Math.round(TOTAL_MINUTES / 60);
const DAYS = Math.round(TOTAL_MINUTES / (60 * 24));

export function HeroCard() {
  return (
    <Card
      className="gap-0 p-0 ring-0"
      style={{
        background:
          "linear-gradient(135deg, var(--orange-flame) 0%, var(--orange-deep) 100%)",
        color: "var(--orange-cream)",
      }}
    >
      <div className="px-8 py-12 sm:px-12 sm:py-16 lg:py-20">
        <p
          className="mb-4 text-xs uppercase tracking-[0.3em] opacity-90"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Your 2026 in Sound
        </p>
        <h1
          className="font-black leading-[0.85] tracking-tight tabular-nums"
          style={{ fontSize: "clamp(4rem, 14vw, 11rem)" }}
        >
          {TOTAL_MINUTES.toLocaleString()}
        </h1>
        <p
          className="mt-2 text-2xl font-medium opacity-95 sm:text-3xl"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          minutes
        </p>
        <div
          className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-widest opacity-90"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          <span className="rounded-full border border-current px-3 py-1">
            ≈ {HOURS.toLocaleString()} hours
          </span>
          <span className="rounded-full border border-current px-3 py-1">
            ≈ {DAYS} days nonstop
          </span>
        </div>
      </div>
    </Card>
  );
}
```

Why those className overrides on `<Card>`:
- `gap-0` clears Card's default `gap-4` (we manage spacing inside ourselves)
- `p-0` clears Card's default `py-4` (our inner `<div>` owns the padding)
- `ring-0` removes Card's default `ring-1 ring-foreground/10` (the gradient bg is its own visual edge; we don't want a faint border on top of it)

- [ ] **Step 3.3:** Edit `src/app/dashboard/page.tsx` — import `HeroCard` and replace the placeholder div with the component. The file becomes:

```tsx
import type { Metadata } from "next";
import { HeroCard } from "@/components/dashboard/HeroCard";

export const metadata: Metadata = {
  title: "Dashboard | Spotify Wrapped",
  description: "A fake Spotify Wrapped poster — playground PR 2.",
};

export default function DashboardPage() {
  return (
    <main
      className="min-h-dvh w-full"
      style={{ backgroundColor: "#000", color: "var(--orange-cream)" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <HeroCard />
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3.4:** Screenshot via Claude in Chrome at **desktop 1440px** at `/dashboard`. Verify:
- HeroCard spans the full content width
- Background is the orange→near-black diagonal gradient (135deg)
- Tiny `YOUR 2026 IN SOUND` label in mono at top
- Massive `47,283` number, dominant on the page
- Subhead `minutes` directly under it in mono
- Two pill badges (`≈ 788 HOURS`, `≈ 33 DAYS NONSTOP`) below
- No console errors

- [ ] **Step 3.5:** Screenshot at **mobile ~390px**. Verify:
- Card still spans full available width (single column at this breakpoint)
- The huge number scales down via `clamp()` and doesn't overflow
- Pills wrap to the next line if needed (`flex-wrap` is on the parent)
- No horizontal scroll

- [ ] **Step 3.6:** Commit.

```bash
git add src/components/dashboard/HeroCard.tsx src/app/dashboard/page.tsx
git commit -m "Add HeroCard with gradient background and total-minutes headline"
```

---

## Task 4: TopArtistsCard

**What this adds:** The first card in the 2×2 grid below the hero. Dark `deep` background, ranked list with `flame`-colored rank digits and genre badges.

**Files:**
- Create: `src/components/dashboard/TopArtistsCard.tsx`
- Modify: `src/app/dashboard/page.tsx`

### Steps

- [ ] **Step 4.1:** Create `src/components/dashboard/TopArtistsCard.tsx`. Full contents:

```tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TOP_ARTISTS } from "@/lib/fake-spotify-data";

export function TopArtistsCard() {
  return (
    <Card
      className="h-full gap-0 p-0 ring-0"
      style={{
        backgroundColor: "var(--orange-deep)",
        color: "var(--orange-cream)",
      }}
    >
      <div className="px-6 py-8 sm:px-8">
        <h2
          className="mb-6 text-xs uppercase tracking-[0.3em]"
          style={{
            fontFamily: "var(--font-jetbrains)",
            color: "var(--orange-flame)",
          }}
        >
          Top Artists · 2026
        </h2>
        <ol className="flex flex-col gap-5">
          {TOP_ARTISTS.map((artist) => (
            <li key={artist.rank} className="flex items-center gap-4">
              <span
                aria-hidden
                className="font-black leading-none tabular-nums"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--orange-flame)",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {artist.rank}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-base font-semibold sm:text-lg">
                  {artist.name}
                </span>
                <Badge
                  variant="outline"
                  className="w-fit"
                  style={{
                    fontFamily: "var(--font-jetbrains)",
                    borderColor:
                      "color-mix(in oklab, var(--orange-flame) 60%, transparent)",
                    color: "var(--orange-cream)",
                    backgroundColor: "transparent",
                  }}
                >
                  {artist.genre}
                </Badge>
              </div>
              <span
                className="shrink-0 text-sm tabular-nums opacity-75"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {artist.minutes.toLocaleString()} min
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
```

Why `h-full` on the Card: in the 2×2 grid, sibling cards (`TopTracksCard`) may have different content heights. `h-full` lets CSS Grid stretch each card to fill its grid cell — so the row stays visually balanced.

Why `aria-hidden` on the rank `<span>`: the rank number is decorative typography; screen readers should read "Treaty Oak Revival, country, 4,892 min" not "1, Treaty Oak Revival, …". The `<ol>` already conveys order semantically.

- [ ] **Step 4.2:** Edit `src/app/dashboard/page.tsx` — import and add `TopArtistsCard` as the first card after the hero. The grid becomes:

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  <div className="lg:col-span-2">
    <HeroCard />
  </div>
  <TopArtistsCard />
</div>
```

Add the import at the top:

```tsx
import { TopArtistsCard } from "@/components/dashboard/TopArtistsCard";
```

- [ ] **Step 4.3:** Screenshot via Claude in Chrome at **desktop 1440px**. Verify:
- Below the hero, a dark `deep`-background card appears in the left column of the 2×2 grid
- Right column is empty (we haven't added Tracks yet — expected)
- Card shows `TOP ARTISTS · 2026` label in `flame` orange at top
- 5 rows, each with a big `flame` rank digit on the left, artist name + genre badge in the middle, "X,XXX min" on the right
- Genre badges have `flame`-colored borders and transparent backgrounds
- No console errors

- [ ] **Step 4.4:** Screenshot at **mobile ~390px**. Verify:
- Card stacks below the hero (single column)
- Long artist names truncate cleanly (no overflow)
- Minutes column doesn't push off the right edge

- [ ] **Step 4.5:** Commit.

```bash
git add src/components/dashboard/TopArtistsCard.tsx src/app/dashboard/page.tsx
git commit -m "Add TopArtistsCard with ranked list and genre badges"
```

---

## Task 5: TopTracksCard

**What this adds:** The right-side card of the 2×2 grid's top row. Light `cream` background, inverted color rhythm from Artists. No minutes column — keeps it visually different.

**Files:**
- Create: `src/components/dashboard/TopTracksCard.tsx`
- Modify: `src/app/dashboard/page.tsx`

### Steps

- [ ] **Step 5.1:** Create `src/components/dashboard/TopTracksCard.tsx`. Full contents:

```tsx
import { Card } from "@/components/ui/card";
import { TOP_TRACKS } from "@/lib/fake-spotify-data";

export function TopTracksCard() {
  return (
    <Card
      className="h-full gap-0 p-0 ring-0"
      style={{
        backgroundColor: "var(--orange-cream)",
        color: "var(--orange-deep)",
      }}
    >
      <div className="px-6 py-8 sm:px-8">
        <h2
          className="mb-6 text-xs uppercase tracking-[0.3em]"
          style={{
            fontFamily: "var(--font-jetbrains)",
            color: "var(--orange-mid)",
          }}
        >
          Top Tracks · 2026
        </h2>
        <ol className="flex flex-col gap-5">
          {TOP_TRACKS.map((track) => (
            <li key={track.rank} className="flex items-center gap-4">
              <span
                aria-hidden
                className="font-black leading-none tabular-nums"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--orange-mid)",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {track.rank}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-base font-semibold sm:text-lg">
                  {track.title}
                </span>
                <span
                  className="truncate text-xs uppercase tracking-wider opacity-70"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {track.artist}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5.2:** Edit `src/app/dashboard/page.tsx` — import and add `TopTracksCard` right after `TopArtistsCard`. Grid becomes:

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  <div className="lg:col-span-2">
    <HeroCard />
  </div>
  <TopArtistsCard />
  <TopTracksCard />
</div>
```

Add the import:

```tsx
import { TopTracksCard } from "@/components/dashboard/TopTracksCard";
```

- [ ] **Step 5.3:** Screenshot via Claude in Chrome at **desktop 1440px**. Verify:
- The 2×2 grid's top row is now filled: Artists (dark) on the left, Tracks (cream) on the right
- Cream card shows `TOP TRACKS · 2026` label in deeper orange (`mid`)
- 5 rows with `mid`-colored rank digits, track title in sans, artist name in small uppercase mono below
- No minutes column on Tracks (intentional — visual differentiation from Artists)
- Both cards in the row have the same height (`h-full` working)

- [ ] **Step 5.4:** Screenshot at **mobile ~390px**. Verify the cards stack vertically (Hero → Artists → Tracks) in a clean single column.

- [ ] **Step 5.5:** Commit.

```bash
git add src/components/dashboard/TopTracksCard.tsx src/app/dashboard/page.tsx
git commit -m "Add TopTracksCard with cream background (inverse of Artists)"
```

---

## Task 6: GenreCard

**What this adds:** Bottom-left of the 2×2 grid. Solid `flame` background — the most saturated card. Three rows of "GENRE 62%" big-percentage layout with a horizontal bar showing the share.

**Files:**
- Create: `src/components/dashboard/GenreCard.tsx`
- Modify: `src/app/dashboard/page.tsx`

### Steps

- [ ] **Step 6.1:** Create `src/components/dashboard/GenreCard.tsx`. Full contents:

```tsx
import { Card } from "@/components/ui/card";
import { GENRES } from "@/lib/fake-spotify-data";

export function GenreCard() {
  return (
    <Card
      className="h-full gap-0 p-0 ring-0"
      style={{
        backgroundColor: "var(--orange-flame)",
        color: "var(--orange-deep)",
      }}
    >
      <div className="px-6 py-8 sm:px-8">
        <h2
          className="mb-6 text-xs uppercase tracking-[0.3em] opacity-85"
          style={{
            fontFamily: "var(--font-jetbrains)",
            color: "var(--orange-deep)",
          }}
        >
          Genres · 2026
        </h2>
        <ul className="flex flex-col gap-6">
          {GENRES.map((g) => (
            <li key={g.name} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xl font-bold sm:text-2xl">{g.name}</span>
                <span
                  className="font-black tracking-tight tabular-nums"
                  style={{
                    fontSize: "clamp(2rem, 5vw, 3rem)",
                    fontFamily: "var(--font-jetbrains)",
                  }}
                >
                  {g.percent}%
                </span>
              </div>
              <div
                aria-hidden
                className="h-1 w-full rounded-full"
                style={{
                  backgroundColor:
                    "color-mix(in oklab, var(--orange-deep) 20%, transparent)",
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${g.percent}%`,
                    backgroundColor: "var(--orange-deep)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
```

- [ ] **Step 6.2:** Edit `src/app/dashboard/page.tsx` — add `GenreCard` after `TopTracksCard`. Grid becomes:

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  <div className="lg:col-span-2">
    <HeroCard />
  </div>
  <TopArtistsCard />
  <TopTracksCard />
  <GenreCard />
</div>
```

Add the import:

```tsx
import { GenreCard } from "@/components/dashboard/GenreCard";
```

- [ ] **Step 6.3:** Screenshot at **desktop 1440px**. Verify:
- A vivid `flame`-orange card appears in the bottom-left of the 2×2 grid
- Right column of the bottom row is still empty (Personality next — expected)
- Card shows `GENRES · 2026` label at top in dark
- Three rows: `House 62%` · `Country 24%` · `Rap 14%`
- Each row has a big dark percentage on the right and a slim horizontal bar below showing the share
- The page now has a clear visual rhythm: dark · light · saturated · empty

- [ ] **Step 6.4:** Screenshot at **mobile ~390px**. Verify it stacks correctly below Tracks.

- [ ] **Step 6.5:** Commit.

```bash
git add src/components/dashboard/GenreCard.tsx src/app/dashboard/page.tsx
git commit -m "Add GenreCard with House/Country/Rap percentages and bars"
```

---

## Task 7: PersonalityCard

**What this adds:** The final card — bottom-right of the 2×2 grid. Closes the loop with a gradient that rotates the Hero's gradient (so they rhyme but don't twin) and the "House Horse" label.

**Files:**
- Create: `src/components/dashboard/PersonalityCard.tsx`
- Modify: `src/app/dashboard/page.tsx`

### Steps

- [ ] **Step 7.1:** Create `src/components/dashboard/PersonalityCard.tsx`. Full contents:

```tsx
import { Card } from "@/components/ui/card";
import { PERSONALITY } from "@/lib/fake-spotify-data";

export function PersonalityCard() {
  return (
    <Card
      className="h-full gap-0 p-0 ring-0"
      style={{
        background:
          "linear-gradient(225deg, var(--orange-flame) 0%, var(--orange-deep) 100%)",
        color: "var(--orange-cream)",
      }}
    >
      <div className="flex h-full flex-col justify-between gap-8 px-6 py-8 sm:px-8">
        <h2
          className="text-xs uppercase tracking-[0.3em] opacity-85"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Your 2026 Identity
        </h2>
        <p
          className="font-black italic leading-[0.95]"
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            color: "var(--orange-cream)",
          }}
        >
          {PERSONALITY.label}
        </p>
        <p
          className="text-sm leading-relaxed opacity-90 sm:text-base"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          {PERSONALITY.tagline}
        </p>
      </div>
    </Card>
  );
}
```

Why `225deg` for the gradient (vs hero's `135deg`): same flame→deep colors, but rotated 90° so the bright corner is bottom-left instead of top-left. The two gradients become a matched pair without being identical — they "rhyme."

- [ ] **Step 7.2:** Edit `src/app/dashboard/page.tsx` — add `PersonalityCard` at the end. The full final composition file becomes:

```tsx
import type { Metadata } from "next";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { TopArtistsCard } from "@/components/dashboard/TopArtistsCard";
import { TopTracksCard } from "@/components/dashboard/TopTracksCard";
import { GenreCard } from "@/components/dashboard/GenreCard";
import { PersonalityCard } from "@/components/dashboard/PersonalityCard";

export const metadata: Metadata = {
  title: "Dashboard | Spotify Wrapped",
  description: "A fake Spotify Wrapped poster — playground PR 2.",
};

export default function DashboardPage() {
  return (
    <main
      className="min-h-dvh w-full"
      style={{ backgroundColor: "#000", color: "var(--orange-cream)" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <HeroCard />
          </div>
          <TopArtistsCard />
          <TopTracksCard />
          <GenreCard />
          <PersonalityCard />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 7.3:** Screenshot at **desktop 1440px**. Verify the full composition:
- Row 1: Hero (full-width gradient, big number)
- Row 2: Artists (dark) · Tracks (cream)
- Row 3: Genres (flame) · Personality (gradient, mirrors hero)
- Color rhythm reads: gradient | dark · light | saturated · gradient
- "House Horse" appears in italic Playfair, dramatic
- Tagline below it in small mono

- [ ] **Step 7.4:** Screenshot full page top-to-bottom (Claude in Chrome can take a full-page screenshot, or stitch two viewport-height screenshots).

- [ ] **Step 7.5:** Screenshot at **mobile ~390px**. Verify the full single-column stack order: Hero → Artists → Tracks → Genres → Personality. No horizontal scroll anywhere.

- [ ] **Step 7.6:** Commit.

```bash
git add src/components/dashboard/PersonalityCard.tsx src/app/dashboard/page.tsx
git commit -m "Add PersonalityCard; complete 5-card dashboard composition"
```

---

## Task 8: Accessibility + polish pass

**What this is:** With all five cards in place, run a Lighthouse audit and address findings. Sweep the page for semantic-HTML and contrast issues before opening the PR.

**Files:**
- Possibly modify: any of the five card files (only if a real issue surfaces)
- Possibly modify: `src/app/globals.css` (only if a contrast tweak is needed)

### Steps

- [ ] **Step 8.1:** In Chrome at `http://localhost:3000/dashboard`, open DevTools → Lighthouse → run an **Accessibility** audit on desktop. Note the score and any specific findings.

- [ ] **Step 8.2:** Address each Lighthouse finding individually. The most likely candidates and how to handle them:

| If Lighthouse flags | Fix |
|---|---|
| `cream`-on-`flame` contrast (GenreCard label/text) | Lower the `opacity-85` on labels to `opacity-100`, or switch the label color from `var(--orange-deep)` to a darker variant. Re-audit. |
| Missing landmark | Confirm `<main>` wraps the whole page in `page.tsx` (it does). Confirm each card's wrapping `<Card>` renders as a `<div>` (it does). |
| Multiple `<h1>` | We have exactly one `<h1>` (in HeroCard). The other four cards use `<h2>`. If a duplicate H1 appears, find and demote. |
| Missing `<ol>` / `<ul>` semantics | Verify TopArtists and TopTracks both use `<ol>` (they do) and Genres uses `<ul>` (it does). |

If no findings exceed informational severity and the score is ≥ 90, proceed without changes.

- [ ] **Step 8.3:** Walk the rendered DOM in DevTools and visually confirm:
- `<main>` is the outermost semantic element of the page
- The HeroCard contains the only `<h1>` on the page
- Each other card uses `<h2>` for its label
- The decorative rank digits in TopArtistsCard and TopTracksCard have `aria-hidden`
- The progress bars in GenreCard have `aria-hidden`
- No `<div>` is acting as an interactive element (no `onClick` on plain divs — there shouldn't be any in this PR)

- [ ] **Step 8.4:** If Step 8.2 or 8.3 changed any files, commit.

```bash
git add -A
git commit -m "A11y pass: fix Lighthouse findings on /dashboard"
```

If nothing changed, skip the commit and move on.

---

## Task 9: PR, self-review, merge, deploy, handoff

**What this is:** Ship it. Open the PR, run `/code-review`, address findings, merge, verify the deploy, write the session handoff.

**Files:**
- Modify: `PROGRESS.md` (tick PR 2 boxes)
- Create: `docs/handoffs/session-4.md` (manual handoff — Will builds the `/handoff` skill in PR 3)

### Steps

- [ ] **Step 9.1:** Open `PROGRESS.md` and tick the PR 2 checkboxes that are now done — at minimum:
- `Branch → brainstorm → plan → execute (same shape as PR 1)`
- `Make sure to use shadcn components throughout...`
- `Verify via Claude in Chrome (Explain-Show-Test loop)`
- The remaining `PR → self-review → merge → check deploy` boxes get ticked after the corresponding steps below.

- [ ] **Step 9.2:** Commit the progress update.

```bash
git add PROGRESS.md
git commit -m "Tick PR 2 progress through execute + verify"
```

- [ ] **Step 9.3:** Push the branch and open the PR.

```bash
git push -u origin pr-2-fake-dashboard
gh pr create --base main --head pr-2-fake-dashboard --title "PR 2 — Fake Spotify Wrapped dashboard at /dashboard" --body "$(cat <<'EOF'
Playground PR. Adds a static Spotify-Wrapped-style dashboard at a new route, `/dashboard`. Five cards (Hero + 2×2 grid) styled in a burnt-orange signature palette. Populated with Will's real music taste and fake numbers.

Spec: docs/superpowers/specs/2026-05-27-pr-2-fake-dashboard-design.md
Plan: docs/plans/pr-2-fake-dashboard.md

## What's in
- New route at `src/app/dashboard/page.tsx` — the `/` mood board is unchanged
- `--orange-*` palette tokens in `globals.css` (alongside existing PR 1 palettes)
- Single typed fake-data file at `src/lib/fake-spotify-data.ts`
- Five card components under `src/components/dashboard/` — every one uses shadcn `<Card>`
- HeroCard with `flame → deep` gradient and giant total-minutes headline
- TopArtistsCard (dark) with ranked list + genre badges
- TopTracksCard (cream) with ranked list, inverse rhythm from Artists
- GenreCard (saturated `flame`) with House/Country/Rap percentages and bars
- PersonalityCard with `deep → flame` rotated gradient and the "House Horse" identity
- Responsive: hero + 2×2 grid ≥1024px, single-column stack below
- A11y: single `<h1>`, semantic `<ol>`/`<ul>`, `aria-hidden` on decorative rank digits and bars

## Verification
Visual via Claude in Chrome at desktop 1440px and mobile 390px. Lighthouse a11y ≥ 90 on desktop. No automated tests — per `CLAUDE.md`, those start at PR 3 (OAuth).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 9.4:** Note the PR URL from the command output, then run `/code-review` on the PR in this Claude session. Read the findings together with Will. For each finding:
- Real correctness issue (e.g., Next.js 16-specific behavior, a11y regression) → fix it
- Style or preference (e.g., "consider extracting X") → discuss with Will, decide
- Out of scope (e.g., "this would be better with real data" — that's PR 4) → ignore with a brief comment

Apply fixes as new commits on the same branch. Push with `git push`.

- [ ] **Step 9.5:** Will merges the PR on github.com (clicks the green Merge button). Vercel auto-deploys after merge.

- [ ] **Step 9.6:** Visit the live URL at `<deployed-url>/dashboard` (the live root is `https://spotify-wrapped-lemon.vercel.app/`, so the dashboard is `/dashboard` on the same domain). Confirm the dashboard renders with all five cards.

- [ ] **Step 9.7:** Switch to `main`, pull, and tick the remaining PR 2 boxes in `PROGRESS.md`:

```bash
git checkout main
git pull
```

Open `PROGRESS.md` and change the final unticked PR 2 checkboxes to `- [x]`. Commit on `main` as a tiny direct fast-forward, or open a housekeeping PR — Will picks.

- [ ] **Step 9.8:** Create the session handoff at `docs/handoffs/session-4.md` capturing: where Will is in the curriculum (PR 2 done, Section 2 still open, PR 3 + Reset PR next), what's live, what to do next session. Use `docs/handoffs/session-3.md` as the format reference.

```bash
git add docs/handoffs/session-4.md
git commit -m "Add session-4 handoff (PR 2 shipped)"
git push  # if you opened a small housekeeping PR for the boxes, push that branch instead
```

---

## Decision log (for transparency)

- **`#000` page background (not `--orange-deep`):** pure black gives the dark cards (Artists, Personality) a subtle warm-vs-cold edge against the page. `--orange-deep` would make them blend in completely. The visible-but-not-stark contrast reads more "designed."
- **`ring-0` on every Card:** the shadcn Card default `ring-1 ring-foreground/10` adds a faint hairline border meant for white-background contexts. On our saturated/gradient cards it reads as visual noise. Explicit `ring-0` is the right call.
- **`h-full` on the four grid cards (not Hero):** Hero spans both columns, so equal-height stretching is automatic. The four grid cards need `h-full` so each row stays balanced even if content lengths differ.
- **No "View dashboard →" link from the mood board page:** it would force decisions about navigation, link styling, and information hierarchy on a page that's about to be deleted in the Reset PR. Skip.
- **Inline `style={{ fontFamily: 'var(--font-X)' }}` instead of Tailwind font utilities:** same trade-off PR 1 made — Tailwind 4's font registration is in `@theme inline`, and adding entries there would touch the shadcn token system. Inline `style` is contained and explicit.
- **`color-mix(in oklab, ...)` used in GenreCard's bar background and TopArtistsCard's badge border:** Tailwind 4 + modern Chrome/Safari/Firefox support it natively. For PR 1 we deferred a Safari < 16.4 fallback; same call here. If a user on an old browser hits the page, the bar/border just appears in the unmixed color — degrades gracefully.
