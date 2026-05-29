# PR 10 — Listening Personality Card (Signature Feature)

**Date:** 2026-05-29
**Status:** Design approved, ready for planning
**Branch (to create):** `pr-10-listening-personality`

## What this is

The signature feature for the capstone — the one thing that makes the app feel like Will's, not a tutorial output. A "Your Listening Personality" section on the dashboard that reads two real signals from the user's Spotify data, maps them to one of four named archetypes, and renders a shareable card. A "Save image" button downloads that card as a PNG suitable for posting (Instagram / iMessage).

PR 10 also includes a non-code task: **submitting the Spotify app for Extended Quota Mode** (see "Out of the card's scope" below).

## The honesty principle (carried from PR 8)

The "personality" must be derived from real, measurable signals — never invented vibes. Both scores are computed from data the app already pulls, the card always displays the actual percentages alongside the archetype label, and when there isn't enough data to read a personality honestly, the section says so instead of guessing.

We deliberately use only the two signals whose data is **guaranteed available today** (artist variety, taste shift over time). We do NOT use genres (blocked until Extended Quota) and do NOT use popularity/release-era (would need unverified fields — explicitly out of scope for this PR).

## The two axes

### Axis 1 — Loyalist ↔ Explorer (artist variety)
- **Source:** top *tracks*, `long_term` window, `limit=50`.
- **Metric:** `explorerPct = round(100 * uniqueArtistCount / trackCount)`, where `uniqueArtistCount` is the number of distinct primary-artist IDs across those tracks. (Use the first artist of each track as its primary artist.)
- **Reading:** 50 tracks by 50 different artists → 100% Explorer. 50 tracks by 10 artists → 20% (Loyalist).

### Axis 2 — Constant ↔ Evolving (taste shift over time)
- **Source:** top *artists* `short_term` (last 4 weeks) and top *artists* `long_term` (all time), both `limit=50`.
- **Metric:** of the `short_term` artists, the fraction whose IDs are **not** present in the `long_term` set. `evolvingPct = round(100 * newRecentCount / shortTermCount)`.
- **Reading:** all recent favorites are new faces → 100% Evolving. All recent favorites also all-time favorites → 0% (Constant).

### Mapping to the 2×2
Midpoint is 50% on each axis:
- explorer < 50 & evolving < 50 → **The Devotee** ("A handful of artists, and they've been your core for ages.")
- explorer ≥ 50 & evolving < 50 → **The Curator** ("Broad taste that's remarkably steady.")
- explorer < 50 & evolving ≥ 50 → **The Phase-Shifter** ("You lock onto a few artists hard, then move to the next obsession.")
- explorer ≥ 50 & evolving ≥ 50 → **The Wanderer** ("Wide open ears, never the same month twice.")

(Exact boundary handling — `≥ 50` goes to the Explorer/Evolving side — is fixed so the result is deterministic.)

## Card design (direction C — "With artists")

Portrait card (4:5). Dark gradient background, Spotify-green accents, Geist font.
- Small uppercase eyebrow: "Listening Personality"
- Archetype name (large, bold)
- One-line archetype description
- Two stat tiles: `{explorerPct}% Explorer` and `{evolvingPct}% Evolving`
- "Built from your top artists" with up to 3 artist avatars (images) + names
- Footer: the live app URL (`spotify-wrapped-lemon.vercel.app`)

Artist images are optional in Spotify's data — when an image is missing, fall back to the colored circle placeholders from the mockup. Reference mockup: `.superpowers/brainstorm/.../card-designs.html` (choice `artists`).

## Components to build

1. **`src/lib/personality.ts`** — pure functions, no I/O:
   - `computeExplorerPct(tracks)`, `computeEvolvingPct(shortTermArtists, longTermArtists)`, `pickArchetype(explorerPct, evolvingPct)`, and a top-level `computePersonality(...)` returning `{ explorerPct, evolvingPct, archetype: { key, name, description } }`.
   - A `hasEnoughData(...)` guard (see edge cases).
2. **`src/lib/personality.test.ts`** — Vitest unit tests (TDD; same pattern as `listening.test.ts`). Cover: each of the four quadrants, boundary at exactly 50%, the not-enough-data guard, and the unique-artist counting (duplicate artists, multi-artist tracks).
3. **A cached loader** in `src/lib/loaders.ts` — fetches the three inputs (long_term top tracks 50, short_term top artists 50, long_term top artists 50) via the existing `getTopTracks`/`getTopArtists` helpers, wrapped in `React.cache` with primitive args (per PR 9's dedup rule).
4. **A streamed dashboard section** — `src/components/sections/personality-section.tsx` (async server component) + presentational `src/components/personality-card.tsx`. Wrapped in `<Suspense>` with a skeleton fallback; renders `<SectionError>` inline on `!result.ok`; renders the "not enough history" message when `hasEnoughData` is false. Added to `src/app/page.tsx` alongside the other streamed sections.
5. **Server-rendered PNG route** — `src/app/api/personality/card/route.tsx` using Next's built-in image generation (`ImageResponse`). Reads the session, computes the same personality, renders the C card layout as a PNG. Must match the on-screen card. **Verify the correct import/usage against the Next 16 docs in `node_modules/next/dist/docs/` before writing it** (per AGENTS.md).
6. **"Save image" button** — in the personality section, triggers download of the PNG route. Decide during planning between an `<a download>` and a fetch-blob approach; prefer the simplest that reliably downloads with a sensible filename.

## Data sufficiency / edge cases

- **Not enough history:** require at least 10 top tracks (long_term) AND a non-empty long_term top-artists list AND a non-empty short_term top-artists list. Otherwise the section renders "Not enough listening history yet to read your personality" — no card, no misleading numbers.
- **Spotify error / network failure:** the loader returns `{ ok: false, ... }` (helpers never throw); the section renders `<SectionError>` inline. The rest of the dashboard is unaffected (independent Suspense boundary).
- **Missing artist images:** fall back to placeholder circles.
- **Anonymous user:** section only renders for a logged-in user, same as the other data sections.

## Out of the card's scope (but part of PR 10)

- **Extended Quota submission** — a manual task on the Spotify developer dashboard. Walk Will through it, likely after the card ships (a finished-looking app helps the review). This is what lets non-approved users log in and unblocks the parked PR 7 genre work.
- **Not building:** genre-based traits, popularity/era traits, multi-card carousels, server-side persistence/history of personality over time.

## Verification plan

- `npm test` (Vitest) green, including the new `personality.test.ts`.
- `tsc` / lint clean.
- In-browser (Claude in Chrome): log in, confirm the section renders the correct archetype for the real data, the two percentages display, top artists show, and the skeleton appears while loading.
- Click "Save image" → confirm a PNG downloads and visually matches the on-screen card.
- Force the loader to fail → confirm inline `<SectionError>`, rest of dashboard intact.
- Honesty check: the displayed percentages are consistent with the archetype label.

## Workflow

Standard spine: branch → (this spec) → writing-plans → execute inline → verify in Chrome → PR → `/code-review` → merge → `/handoff`. Then the Extended Quota submission.
