# PR 9 · Polish Pass — Design

**Date:** 2026-05-29
**Branch:** `pr-9-polish`
**Status:** Spec — awaiting review before planning

## Goal

Make the existing dashboard feel finished without adding new features. Four focused pieces, scoped to a single PR. The point of a polish PR is to close the gap between "works" and "feels good" — and to do it without scope creep.

## In scope

1. **Font fix** — headings currently render as a serif fallback on the live site.
2. **Mobile pass** — verify and fix the layout at phone width.
3. **Per-section streaming + graceful errors** — the main refactor.
4. **Dark mode toggle** — wire up the dormant dark palette with a user-facing toggle.

## Explicitly out of scope

- Now-playing polling pause (pause poll when tab backgrounded) — deferred.
- Empty-state tidying (e.g. "nothing played recently") — deferred.
- Genre breakdown (PR 7) — still blocked until Extended Quota (PR 10).

---

## 1. Font fix

**Problem:** [`src/app/globals.css`](../../../src/app/globals.css) line 10 declares `--font-sans: var(--font-sans);` — a variable pointing at itself, which resolves to nothing. [`src/app/layout.tsx`](../../../src/app/layout.tsx) loads the Geist font under the variable `--font-geist-sans`. So `--font-sans` (and `--font-heading`, which derives from it) never resolves to the loaded font, and text falls back to the browser default serif.

**Fix:** Point `--font-sans` at the loaded font:

```css
--font-sans: var(--font-geist-sans);
```

`--font-heading` already derives from `--font-sans`, so it's fixed by the same change. No other edits needed.

**Verification:** Headings on the live/dev page render in Geist (sans-serif), not serif.

---

## 2. Mobile pass

**Problem:** The dashboard has never been visually confirmed at phone width. Session 13 flagged the three Headline Stats KPI cards (`grid-cols-1 sm:grid-cols-3`) as unverified at narrow widths.

**Approach:** This is mostly verification, not code. Open the app at a phone viewport in Claude-in-Chrome, screenshot every section, and confirm:

- Headline Stats stack to one column on phones (no cramping/overflow).
- Top Tracks / Top Artists / Recently Played list rows don't overflow or truncate awkwardly.
- The time-range toggle, header, and login/logout button fit and remain tappable.

Fix any spacing/overflow/typography issues found. No layout rewrite expected — targeted Tailwind tweaks only.

**Verification:** Screenshots at phone width (~390px) show every section laid out cleanly, nothing clipped or overlapping.

---

## 3. Per-section streaming + graceful errors

**Problem:** [`src/app/page.tsx`](../../../src/app/page.tsx) resolves the whole view in one shot: `resolveViewState` runs `Promise.all` over four Spotify calls (profile, top tracks, top artists, recently played) and returns a single `ViewState`. Two consequences:

- **No loading feedback** — the page blocks until *all* data is ready, then renders everything at once.
- **All-or-nothing failure** — if any one of the four calls fails, the entire dashboard is replaced by an error state. A flaky "recently played" call blanks your top tracks too.

**Design:** Split the page into a fast shell plus independently-streaming sections.

- **Top-level (blocking, fast):** Resolve the session, then fetch the user profile (`getMe`). The profile is needed for the "Logged in as …" header regardless, and it's a single quick call. Its result still drives the global states:
  - no session → `anonymous` view (login button)
  - `401` → `expired` view (re-login message)
  - other failure → `spotify-down` view
  - success → render the shell (header, theme toggle, time-range toggle, logout) and the streaming sections below.

- **Streaming sections:** Each of these becomes its own async unit that fetches its own data and is wrapped in a `Suspense` boundary with a skeleton fallback:
  - Top Tracks
  - Top Artists
  - Recently Played
  - Headline Stats

  While a section's data is in flight, its skeleton shows; when ready, the real content streams in. Sections load independently — fast ones appear first.

- **Per-section error isolation:** Our Spotify helpers return `{ ok: false, status, reason }` rather than throwing, so each section can check its own result and render a small inline "couldn't load this section" message on failure. The rest of the dashboard is unaffected. (The global `expired`/`spotify-down` states are still handled once at the top via the profile call; section-level errors are the non-fatal remainder.)

- **Skeletons:** Add shadcn's `Skeleton` component (`npx shadcn@latest add skeleton`) and build a small skeleton per section shape (a few placeholder rows for the lists, placeholder cards for Headline Stats). Stay on the design system — no hand-rolled spinners.

**Open implementation question (resolve during planning, not now):**
Headline Stats derives from data the other sections also fetch (top artist from artists, top track from tracks, recent summary from recently-played). If each section fetches independently, that's overlapping requests. Next.js / React deduplicates identical `fetch` calls within a single server render ("request memoization"), so this *should* be free — but our Next.js version has documented quirks (see `AGENTS.md`). **During planning, read the installed Next.js docs in `node_modules/next/dist/docs/` to confirm request dedup behavior and the exact streaming/Suspense API.** Fallback if dedup doesn't apply cleanly: Headline Stats does its own small set of fetches (a few extra API calls — acceptable).

**Verification:**
- Skeletons visibly appear, then real content streams in (throttle network in Chrome to see it).
- Forcing one section to fail (e.g. temporarily break its fetch) shows an inline error for *that section only*; the others render normally.
- Expired/down states still work as before.

---

## 4. Dark mode toggle

**Problem:** [`src/app/globals.css`](../../../src/app/globals.css) already defines a full `.dark` palette (lines 86–118) and the `dark` custom variant (line 5), but nothing ever applies the `.dark` class — it's dormant.

**Design:**

- Add the `next-themes` provider (the standard, well-supported way to manage theme in a Next.js App Router app). Wrap the app in [`src/app/layout.tsx`](../../../src/app/layout.tsx), add `suppressHydrationWarning` on `<html>` (next-themes sets the class before hydration, which would otherwise warn).
- **Default = follow system.** `defaultTheme="system"` with `enableSystem`. If the user's OS is dark, the app opens dark; otherwise light.
- **Toggle button** in the card header, top-right. Built from the shadcn `Button` (ghost/icon variant) plus a lucide icon (sun/moon). Clicking flips between light and dark and persists the choice (next-themes handles persistence via localStorage).
- The toggle is a small client component (it needs interactivity); everything else stays as-is.

**Verification:**
- Toggle flips the whole dashboard between light and dark; colors come from the existing palette.
- With OS in dark mode and no prior choice, the app opens dark.
- Choice persists across reload.
- No hydration-mismatch console warnings.

---

## Workflow notes

- Standard spine: this spec → `writing-plans` → execute inline → verify in Chrome (Explain-Show-Test) → PR → `/code-review` → merge → `/handoff`.
- The leftover PR 8 `PROGRESS.md` tick rides along on this branch (committed with the spec, since `main` is branch-protected).
- This branch will not touch the parked `pr-7-genre-breakdown` work.
