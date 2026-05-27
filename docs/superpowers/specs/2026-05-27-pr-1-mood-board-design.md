# PR 1 — Split-Screen Mood Board Landing Page

**Date:** 2026-05-27
**Branch:** `pr-1-landing-page`
**Status:** Spec approved, ready to plan

## Overview

A single-page, scroll-down landing page that mood-boards the aesthetic clash between Treaty Oak Revival (Texas red-dirt country) and KETTAMA (Irish rave/techno). The page is the art — no product, no CTA, no real data. The visual concept is a vertical split-screen that holds the tension between the two artists' worlds across hero, bios, quote section, and footer.

This is PR 1 of the Spotify Wrapped capstone — a playground PR with fake/static content. The goal is to learn shadcn/ui composition, the brainstorm → plan → execute → verify → PR loop, and visual verification via Claude in Chrome. The page gets thrown away after PR 2 (per the capstone curriculum).

## Page architecture

Four sections, top to bottom:

1. **Hero** — full viewport (`100vh`) vertical split.
   - Left half: warm/dusty palette, "TREATY OAK REVIVAL" in massive serif type, subtitle "Texas. Dirt. Denim."
   - Right half: cold/electric palette, "KETTAMA" in massive condensed mono type, subtitle "Galway. Bass. Fog."
   - Thin vertical divider down the middle with a small `×` label (matching the way Will originally phrased the project as "Treaty Oak Revival × KETTAMA"). Swappable in execution if a different label reads better.
   - Treated background photos on each half (see Visual System).

2. **Identity strip** — still split. Each side has a 2–3 sentence bio in the artist's voice and a single `<Badge>` tag (`EST. 2019 · TX` on the left, `LIVE · GALWAY · DUBLIN` on the right).

3. **Quote clash** — typographic section, still split. Left: a country-style lyric quote (stand-in copy — real lyrics are copyrighted). Right: a rave-style pull quote / track-title vibe.

4. **Footer** — full-width thin row. Single line: "A fanmade mood board · made with shadcn · not affiliated."

## Visual system

### Country side (left half)
- Background gradient: cream `#F4EAD5` (top) → dusty rust `#9B5C3F` (bottom)
- Hero photo: stock outdoor country/Americana concert from Unsplash, sepia-duotone treatment, sitting behind the gradient overlay
- Text color: deep brown/near-black `#1F1410`
- Accent: muted gold `#C99A4A`
- Font: `Playfair Display` for the artist name, system serif for body

### Rave side (right half)
- Background: near-black `#0A0A0F` base with a radial acid-green `#9FFF3D` glow in one corner
- Hero photo: stock rave/nightclub scene from Unsplash, cyan-or-acid-green duotone, slightly blurred, behind the dark overlay
- Text color: off-white `#F0F0F2`
- Accent: electric blue `#3D8BFF` — used sparingly (link hover states, etc.)
- Font: `JetBrains Mono` for everything on this side

### Shared structure
- Single shared type scale (same sizes across both halves; different fonts produce the contrast)
- Hero artist names use `clamp(4rem, 12vw, 11rem)` for fluid sizing
- Generous vertical section padding (`py-24` or larger on desktop)
- Symmetrical horizontal padding system on both halves

## Component breakdown

### Files created or edited

| Path | Action | Purpose |
|---|---|---|
| `src/app/page.tsx` | Edit | Replace default scaffold content; compose the four section components |
| `src/app/layout.tsx` | Edit | Wire up Google Fonts (Playfair Display, JetBrains Mono) via `next/font/google` |
| `src/app/globals.css` | Edit | Add CSS variables for the two palettes |
| `src/components/landing/Hero.tsx` | New | Full-viewport split-screen hero |
| `src/components/landing/IdentityStrip.tsx` | New | Bios section |
| `src/components/landing/QuoteClash.tsx` | New | Typographic quote section |
| `src/components/landing/SiteFooter.tsx` | New | Footer row |
| `public/images/hero-country.jpg` | New asset | Stock photo from Unsplash, target ≤600KB |
| `public/images/hero-rave.jpg` | New asset | Stock photo from Unsplash, target ≤600KB |

### Shadcn primitives in use
- `<Badge>` — one per side in the Identity Strip, each with custom Tailwind class overrides for its palette

`<Card>` and `<Button>` are intentionally not used — the design doesn't call for them and forcing them in would be ceremonial. PR 2's dashboard will use both extensively.

## Responsive behavior

| Breakpoint | Layout |
|---|---|
| `≥1024px` (Tailwind `lg`) | Full vertical split as designed; 50/50 columns; hero is `100vh` |
| `768–1023px` (Tailwind `md`) | Vertical split preserved; type shrinks via `clamp()`; spacing tightens |
| `<768px` (mobile) | Split flips to **horizontal stack** — country half on top, rave half below. Sections 1–3 follow this flip (hero, identity strip, quote clash). The footer is a full-width single row at every breakpoint and doesn't flip. Hero becomes ~100vh total (50/50 stacked vertically). Divider label sits on the horizontal seam. |

Implementation via Tailwind mobile-first prefixes: base styles = stacked; `lg:` = split. CSS Grid (`grid-cols-1 lg:grid-cols-2`) handles the whole swap in one line.

Hero typography wrapping: on mobile, "TREATY OAK REVIVAL" intentionally wraps each word onto its own line — looks deliberate, not broken.

## Accessibility

- Color contrast: both halves must clear WCAG AA on body text. The country side is the riskier one (warm-on-warm) — text colors chosen specifically for contrast, not just mood.
- Semantic HTML: real `<header>`, `<main>`, `<section>`, `<footer>` tags throughout.
- `alt` text on both hero `<Image>` elements describing the mood, not generic "photo".
- Respects `prefers-reduced-motion` via Tailwind's `motion-reduce:` prefix — any fade/transition is disabled for users who've opted out.
- Image loading uses Next.js `<Image>` for automatic optimization and lazy loading.

## Out of scope

Explicitly NOT in PR 1:
- A dedicated mood-board photo grid section (option B from brainstorm; we picked treated-backgrounds-only)
- Interactive split (the kind that follows mouse position)
- Real artist press photos / press kit imagery
- Real lyrics (copyrighted — stand-in copy only)
- Audio or music embeds
- Spotify integration of any kind (that's PR 3+)
- Dark mode toggle (the page is intentionally dual-tone already)

## Definition of done

- Dev server runs cleanly with zero console errors or warnings related to this code
- Page renders correctly at three viewports — desktop (≥1024), tablet (~800), mobile (~390) — verified via Claude in Chrome screenshots
- Country half body text passes WCAG AA contrast (4.5:1 minimum)
- All four sections are present and visually distinct
- Mobile layout flips to horizontal stack correctly
- No hand-rolled buttons or cards anywhere (uses shadcn `<Badge>` where a component is needed)
- Page commits on `pr-1-landing-page` branch, PR opened to `main`
- `/code-review` run on the PR; findings triaged and addressed where they're real
- PR merged; live Vercel deploy verified at the production URL
