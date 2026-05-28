# Reset PR — Strip the playground

**Date:** 2026-05-27
**Branch:** `reset-playground`
**Status:** Spec approved, ready to plan

## Overview

Delete the PR 1 mood board (`/`) and the PR 2 fake dashboard (`/dashboard`) so Phase 2 starts from a clean Next.js + shadcn skeleton. Mostly file deletions. One small new component: a quiet "Log in with Spotify" stub at `/` so the live URL signals "app in progress" instead of "empty scaffold".

This is the transition PR between Phase 1 (playground, fake data) and Phase 2 (real Spotify build, starting with OAuth in PR 3). The shadcn primitives stay installed and the Next.js scaffold is left untouched — what gets stripped is everything the playground added on top.

## Why a stub instead of the default Next.js page

The PROGRESS.md instruction is "reset the app to a clean Next.js + shadcn skeleton." Two readings:

1. **Default Next.js scaffold** — boring but honest. Strongest signal that the playground is gone.
2. **Minimal "Log in with Spotify" stub** — hints at what's coming. The live URL ([spotify-wrapped-lemon.vercel.app](https://spotify-wrapped-lemon.vercel.app/)) reads as an app in progress, not an empty scaffold.

We're going with the stub. It exercises a shadcn primitive (Button) in a real way and gives Will something he wouldn't be embarrassed to send to a friend. The disabled state is honest — nothing actually works yet — and PR 3 wires the button up for real with one prop change.

## What gets deleted

### Files

- `src/components/landing/Hero.tsx`
- `src/components/landing/IdentityStrip.tsx`
- `src/components/landing/QuoteClash.tsx`
- `src/components/landing/SiteFooter.tsx`
- `src/components/dashboard/HeroCard.tsx`
- `src/components/dashboard/TopArtistsCard.tsx`
- `src/components/dashboard/TopTracksCard.tsx`
- `src/components/dashboard/GenreCard.tsx`
- `src/components/dashboard/PersonalityCard.tsx`
- `src/lib/fake-spotify-data.ts`
- `src/app/dashboard/page.tsx`

### Directories

After the file deletions above, `src/components/landing/`, `src/components/dashboard/`, and `src/app/dashboard/` will be empty. Remove the empty directories so the file tree stays clean.

## What gets modified

### `src/app/page.tsx`

Replace the current composition of four landing components with the new stub. The new page:

- A `<main>` that fills the viewport and centers its child both axes
- One shadcn `<Card>` containing:
  - `<CardHeader>` with a `<CardTitle>` ("Spotify Wrapped") and a `<CardDescription>` ("Your listening, your year. Coming soon.")
  - `<CardContent>` holding a disabled shadcn `<Button>` labeled "Log in with Spotify"

No custom palette, no custom fonts beyond the default Geist Sans. The Card uses default shadcn tokens. The Button uses the default variant in its disabled state — no `onClick` (PR 3 adds the OAuth handler). Visually quiet on purpose.

Copy may be adjusted at execute-time after Will sees it rendered.

### `src/app/layout.tsx`

- **Remove** the `Playfair_Display` and `JetBrains_Mono` imports from `next/font/google`
- **Remove** the corresponding `playfair` and `jetbrains` `const` declarations
- **Remove** the `${playfair.variable}` and `${jetbrains.variable}` references from the `<html>` `className`
- **Keep** `Geist` and `Geist_Mono` exactly as they are
- **Update metadata:**
  - `title`: `"Treaty Oak Revival × KETTAMA"` → `"Spotify Wrapped"`
  - `description`: `"A fanmade mood board."` → `"See your Spotify listening as a Wrapped-style dashboard."`

The `<body>` structure (`min-h-full flex flex-col`) stays — the new `/` page uses `flex-1` on its `<main>` to fill the viewport, same pattern as before.

### `src/app/globals.css`

Delete lines 85–101 — the three custom palette comment blocks and their tokens:

- `--tor-cream`, `--tor-rust`, `--tor-text`, `--tor-gold` (PR 1 Treaty Oak Revival palette)
- `--kett-black`, `--kett-acid`, `--kett-text`, `--kett-blue` (PR 1 KETTAMA palette)
- `--orange-flame`, `--orange-deep`, `--orange-cream`, `--orange-mid` (PR 2 burnt-orange palette)

Everything else stays untouched: the `@import`s, the `@theme inline` block, the shadcn `:root` and `.dark` token blocks, and the `@layer base` rules including the `prefers-reduced-motion` media query.

## What survives untouched

- `src/components/ui/badge.tsx`, `button.tsx`, `card.tsx` — the shadcn primitives
- `src/lib/utils.ts` — the shadcn `cn` helper
- `package.json` and `package-lock.json` — no dependency changes
- All Next.js / TypeScript / shadcn config files
- Everything in `docs/` from prior PRs

## PR wrap-up

- Tick the four checkboxes in the "Reset → Phase 2" section of [PROGRESS.md](../../../PROGRESS.md) (lines ~248–251)
- Include [docs/handoffs/session-5.md](../../handoffs/session-5.md) in this PR's wrap-up commit — session-5 explicitly documents that it rides along with the Reset PR's wrap-up commit, not its own PR
- Standard PR loop: commit → push → open PR → `/code-review` → address findings → merge → confirm Vercel auto-deploy shows the stub at the live URL
- End-of-session `/handoff` (still using the manual pattern; Will's own `/handoff` skill gets built in PR 3)

## Verification

After execution, verify against the plan via the Explain-Show-Test loop:

1. Dev server starts cleanly (`http://127.0.0.1:3000` — using `127.0.0.1` consistently with Spotify's redirect-URI requirement, even though it doesn't matter until PR 3)
2. `/` shows a single centered card with the stub
3. `/dashboard` returns a 404 (route no longer exists)
4. Browser tab title reads "Spotify Wrapped"
5. No console errors, no unused-import warnings
6. `npm run build` succeeds with no TypeScript errors (the deleted components had no callers left other than the files we modified, but verify)

## Out of scope

- Any OAuth code, environment variables, or Spotify SDK setup — that's PR 3
- Any styling on the stub beyond default shadcn tokens
- Removing `tw-animate-css` from `globals.css` even though only PR 2 used animations — leave it; it's tiny and likely useful again in PR 9 (polish)
- Removing any shadcn components even if currently unused (`Badge` is unused after the deletions but stays — cheap to keep, useful in PR 4+)
- Cleaning up `package.json` scripts or dependencies — none of the playground PRs added deps that aren't generally useful
