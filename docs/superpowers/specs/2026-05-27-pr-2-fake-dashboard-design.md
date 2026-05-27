# PR 2 — Fake Spotify Wrapped Dashboard

**Date:** 2026-05-27
**Branch:** `pr-2-fake-dashboard`
**Status:** Spec approved, ready to plan

## Overview

A static "Spotify Wrapped"-style dashboard for Will's actual music taste, populated with hardcoded fake numbers. The dashboard lives at a **new route**: `/dashboard`. The PR 1 mood board at `/` is unchanged. Both pages coexist until the Reset PR (which deletes both before Phase 2 starts).

The visual mood is **Wrapped poster** — saturated, chunky, big numbers, gradient-heavy. The palette is a **disciplined burnt-orange signature** (one color carried across the page; cards vary by combining the same four tokens in different recipes). Five cards: a wide hero on top, then a 2×2 grid of stat cards below.

This is PR 2 of the Spotify Wrapped capstone — still a playground PR with fake data. The goal is to learn shadcn `<Card>` composition, multi-component layout (especially CSS Grid), and to continue practicing the brainstorm → plan → execute → verify → PR loop. The whole page gets thrown away in the Reset PR.

## Why a new route instead of replacing the homepage

`/` (the mood board) remains the live landing page. `/dashboard` is the new file at `src/app/dashboard/page.tsx`. This:

1. Teaches Will Next.js's filesystem routing — *folder name = URL path, `page.tsx` is the entry file*. This is a concept he'll use the rest of his career, and PR 2 is a clean place to introduce it without auth or data fetching complicating the lesson.
2. Lets both playground PRs stay deployed and shareable until the Reset.
3. Avoids touching `src/app/page.tsx`, keeping the PR's blast radius narrow.

A small "View dashboard →" link from the mood board page is **out of scope** for this PR. It's tempting but it pulls in concerns (where it lives in the mood board, how it's styled) that drift from the core lesson. Skipped.

## Page architecture

One page at `/dashboard`, five `<Card>` sections, top to bottom:

1. **HeroCard** — full-width, spans the grid. "Your 2026 in Sound" headline + giant total-minutes number.
2. **TopArtistsCard** — top-left of the 2×2 grid. Ranked list of Will's top 5 artists.
3. **TopTracksCard** — top-right of the 2×2 grid. Ranked list of top 5 tracks.
4. **GenreCard** — bottom-left of the 2×2 grid. House / Country / Rap percentage split.
5. **PersonalityCard** — bottom-right of the 2×2 grid. The made-up "House Horse" identity label.

The page itself (`src/app/dashboard/page.tsx`) is a thin composition file — just imports + a grid wrapper + the five cards. No logic.

## Visual system

### Palette tokens (added to `globals.css`)

The PR 1 palettes (`--tor-*`, `--kett-*`) remain in place — they're still in use by the homepage. PR 2 adds a new burnt-orange family alongside them:

```css
--orange-flame: #FF4500;   /* signature — the "burnt orange" */
--orange-deep:  #1A0500;   /* near-black w/ warm undertone */
--orange-cream: #FFE8D6;   /* pale apricot for inverse cards */
--orange-mid:   #C2360F;   /* deeper accent for borders/text on cream */
```

These four tokens — combined differently — define every card. That's the "disciplined signature": variety without chaos.

### Per-card visual treatment

| Card | Background | Text | Accent |
|---|---|---|---|
| **HeroCard** | Linear gradient `flame → deep` (135deg) | `cream` | `flame` (for label chips) |
| **TopArtistsCard** | Solid `deep` | `cream` | `flame` on rank numbers and badges |
| **TopTracksCard** | Solid `cream` | `deep` | `mid` on rank numbers and badges (inverse rhythm vs. Artists) |
| **GenreCard** | Solid `flame` | `deep` | Horizontal bars in `deep` on `flame`, plus a thin `cream` strip per row |
| **PersonalityCard** | Linear gradient `deep → flame` (225deg — rotated from hero so they rhyme but don't twin) | `cream` | `flame` for the italic label, `cream` for the mono tagline |

The dark/light alternation across the 2×2 grid (Artists `deep` · Tracks `cream` / Genres `flame` · Personality `deep→flame`) gives the grid a checkerboard rhythm — every card is visually distinct from its neighbors.

### Typography

| Element | Font | Notes |
|---|---|---|
| Big numbers (hero stat, genre %, rank digits) | `Geist` (sans, already loaded) | Weight 900, tight letter-spacing, large clamp |
| Card titles / section labels | `JetBrains Mono` (loaded in PR 1) | Uppercase, wide letter-spacing, small (10–12px) |
| Artist + track names in lists | `Geist` (sans) | Weight 600, normal case, mid-size |
| Personality label "House Horse" | `Playfair Display` (loaded in PR 1) | Italic, large, dramatic |
| Personality tagline | `JetBrains Mono` | Normal weight, small, generous line-height |

No new fonts. We reuse what PR 1 already loaded.

## The five cards — content + behavior

### 1. HeroCard

- **Label (top):** `YOUR 2026 IN SOUND`
- **Headline (huge):** `47,283`
- **Subhead:** `minutes`
- **Sub-stats row (below):** `≈ 788 hours` · `≈ 33 days nonstop`
- **No interactivity.** Static card.

### 2. TopArtistsCard

- **Label:** `TOP ARTISTS · 2026`
- **List (5 rows):**

| Rank | Artist | Genre | Minutes |
|---|---|---|---|
| 1 | Treaty Oak Revival | country | 4,892 |
| 2 | KETTAMA | house | 4,201 |
| 3 | John Summit | house | 3,847 |
| 4 | Slightly Stoopid | reggae rock | 2,103 |
| 5 | Eric Prydz | progressive house | 1,956 |

- Each row: large `flame`-colored rank number on the left, artist name + genre `<Badge>` middle, minutes on the right.

### 3. TopTracksCard

- **Label:** `TOP TRACKS · 2026`
- **List (5 rows):**

| Rank | Track | Artist |
|---|---|---|
| 1 | Whole Lotta Lovin' | Treaty Oak Revival |
| 2 | Where You Are | John Summit, HAYLA |
| 3 | Opus | Eric Prydz |
| 4 | Last Time | KETTAMA |
| 5 | Closer to the Sun | Slightly Stoopid |

- Each row: large `mid`-colored rank number, track name (sans, bold) + artist (mono, small), no minutes (keeps it visually different from Artists card).

### 4. GenreCard

- **Label:** `GENRES · 2026`
- **Three rows:** `House 62%` · `Country 24%` · `Rap 14%`
- Each row is a big percentage number, the genre name, and a horizontal bar showing the share — bars use `deep` on the `flame` background.

### 5. PersonalityCard

- **Label:** `YOUR 2026 IDENTITY`
- **Big name:** *House Horse* (italic Playfair Display)
- **Tagline:** "Half stallion, half subwoofer. Built for back roads and basslines, equally at home in a Galway warehouse and on a back porch at last call."

## Component breakdown

### Files created or edited

| Path | Action | Purpose |
|---|---|---|
| `src/app/globals.css` | Edit | Add `--orange-*` palette tokens after the existing `--tor-*` / `--kett-*` tokens in `:root` |
| `src/app/dashboard/page.tsx` | New | The `/dashboard` route — composes the five cards in a grid |
| `src/lib/fake-spotify-data.ts` | New | Typed exports of all fake data (artists, tracks, genres, totals, personality) — single source of truth so cards stay in sync |
| `src/components/dashboard/HeroCard.tsx` | New | Full-width "Your 2026 in Sound" card |
| `src/components/dashboard/TopArtistsCard.tsx` | New | Ranked top-5-artists card |
| `src/components/dashboard/TopTracksCard.tsx` | New | Ranked top-5-tracks card |
| `src/components/dashboard/GenreCard.tsx` | New | House/Country/Rap percentage card |
| `src/components/dashboard/PersonalityCard.tsx` | New | "House Horse" identity card |

**Out of scope:** any changes to `src/app/page.tsx`, `src/app/layout.tsx`, or any PR 1 file. PR 2 is purely additive.

### Shadcn primitives in use

- `<Card>` (with `<CardHeader>`, `<CardContent>`) — once per card, five total. The main lesson of PR 2 is using one primitive five different ways.
- `<Badge>` — for genre tags inside `TopArtistsCard` and possibly small accent labels.

Both are already installed (`src/components/ui/card.tsx`, `src/components/ui/badge.tsx`). No new primitives are added in this PR.

Styling pattern (carried over from PR 1): use `variant="outline"` (or the closest existing variant) and apply palette overrides via `className` + inline `style` for CSS variable references. Don't override the default variant via brute force — work with the primitive's API.

### Data file shape

`src/lib/fake-spotify-data.ts` exports typed constants:

```ts
export type Artist = { rank: number; name: string; genre: string; minutes: number };
export type Track  = { rank: number; title: string; artist: string };
export type GenreSplit = { name: string; percent: number };

export const TOTAL_MINUTES = 47283;
export const TOP_ARTISTS: Artist[] = [/* the 5 rows above */];
export const TOP_TRACKS:  Track[]  = [/* the 5 rows above */];
export const GENRES:      GenreSplit[] = [
  { name: "House",   percent: 62 },
  { name: "Country", percent: 24 },
  { name: "Rap",     percent: 14 },
];
export const PERSONALITY = {
  label: "House Horse",
  tagline: "Half stallion, half subwoofer. Built for back roads and basslines, equally at home in a Galway warehouse and on a back porch at last call.",
};
```

Components import from this file and never hardcode their own copies. This is the discipline the real Spotify integration (PR 4+) will need: data shape lives in one place, components consume it.

## Responsive behavior

| Breakpoint | Layout |
|---|---|
| `≥1024px` (Tailwind `lg`) | Hero spans full width row 1. Below: 2×2 grid (`grid-cols-2`). Page is centered with `max-w-7xl mx-auto` and `px-8` padding. |
| `768–1023px` (Tailwind `md`) | Hero full-width. 2×2 grid stays 2×2 but cards tighten. |
| `<768px` (mobile) | Everything collapses to single column (`grid-cols-1`). Order: Hero → Artists → Tracks → Genres → Personality. Padding reduces to `px-4`. |

Implementation via mobile-first Tailwind: `grid grid-cols-1 lg:grid-cols-2 gap-6`. Hero gets `lg:col-span-2` to span both columns of the 2×2.

The vertical page has its own top/bottom padding (`py-12 lg:py-20`). There is **no** visible page-level title above the cards — the HeroCard owns the only "YOUR 2026 IN SOUND" label on the page, so we don't repeat it. The browser tab title is `Dashboard | Spotify Wrapped` via Next.js `metadata` export on the page file.

## Static, no toggles

PR 2 contains **no client-side state**, no time-window switchers, no animations beyond CSS hover defaults. Every component is a Server Component. Time-window toggling is the explicit focus of PR 5 in the curriculum and should not bleed back into PR 2.

## Verification model

This PR has no automated tests. Verification is visual via Claude in Chrome screenshots at two viewports:

- **Desktop, 1440px wide** — verify hero + 2×2 grid layout, color rhythm across the grid, type hierarchy
- **Mobile, ~390px wide** — verify single-column stack order, padding adjustments, no horizontal scroll, no text overlap

Plus a Lighthouse Accessibility audit on the desktop view, targeting score **≥ 90** (same bar as PR 1). Likely a11y concerns to pre-empt:
- Color contrast: `cream` on `deep` and `deep` on `cream` should both be ≥ WCAG AA (the chosen colors should pass; verify in execution)
- Each card has a semantic heading (the card label/title is `<h2>` or `<h3>`)
- The page has a single `<h1>` — the HeroCard's headline ("47,283 minutes" wrapped in an h1, or the "Your 2026 in Sound" label, whichever reads more naturally in execution); the other four cards use `<h2>` for their labels
- Decorative elements (rank numbers, bars) get `aria-hidden`

Automated tests start in PR 3 (OAuth), per `CLAUDE.md`.

## Definition of done

- [ ] `/dashboard` route renders all five cards in the agreed layout
- [ ] All five cards use shadcn `<Card>` (no hand-rolled card-like divs)
- [ ] Palette tokens (`--orange-*`) live in `globals.css` alongside the PR 1 palettes
- [ ] All fake data lives in `src/lib/fake-spotify-data.ts` (no duplicated literals across components)
- [ ] Visual checks pass at desktop and mobile via Claude in Chrome
- [ ] Lighthouse a11y score ≥ 90
- [ ] PR opened, `/code-review` run, findings addressed or explicitly deferred
- [ ] Merged to `main`, Vercel auto-deploy verified at `<live-url>/dashboard`
- [ ] PROGRESS.md PR 2 boxes ticked
- [ ] Handoff written to `docs/handoffs/session-4.md`

## Decisions and trade-offs (for transparency)

- **New route vs. replace homepage:** chose new route (`/dashboard`) so the mood board stays live and Will gets a Next.js routing lesson at zero cost. The Reset PR will delete both regardless.
- **Static, no toggles:** the curriculum reserves time-window state for PR 5. Resisting feature creep here keeps PR 2's lesson focused on layout and shadcn `<Card>` composition.
- **Burnt orange signature over Wrapped candy:** Will picked the disciplined direction. Result: one palette family, four tokens, distinct per-card recipes. Easier to design coherently than candy chaos.
- **Five cards, not three or seven:** Three (Hero + Artists + Tracks) doesn't stretch the layout lesson. Seven gets crowded and risks unfinished polish. Five is enough to do well.
- **Card images / artist photos:** intentionally not in this PR. Adding artist images would require either stock photos with licensing concerns or scraping cover art (both PR-1-style and out of scope). Pure typography + palette carries the design.
- **Music personality copy:** "House Horse" was Will's preference over "Tex-House Cowboy." Tagline is mine — fully replaceable in execution if Will wants to rewrite it.
- **Data realism:** fake minutes are tuned to feel plausible (47K min/year ≈ 130 min/day, which is a heavy-but-real listener). Track titles are real songs by the named artists where possible — checked from public Spotify search.
- **No `<h1>` at page level:** the HeroCard's headline is the `<h1>`. Avoids the duplicate-heading problem PR 1 hit.
