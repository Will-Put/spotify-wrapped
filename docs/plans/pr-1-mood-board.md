# PR 1 Implementation Plan — Treaty Oak Revival × KETTAMA Mood Board

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, deployed, split-screen mood-board landing page that captures the aesthetic clash between Treaty Oak Revival (Texas red-dirt country) and KETTAMA (Irish rave/techno).

**Architecture:** Single Next.js 16 page composed of four section components (`Hero`, `IdentityStrip`, `QuoteClash`, `SiteFooter`) under `src/components/landing/`. Two custom palettes (warm/dusty + cold/electric) live as CSS variables in `globals.css` alongside the existing shadcn tokens. Two Google Fonts (Playfair Display, JetBrains Mono) load via `next/font/google` and expose as CSS variables. Layout uses CSS Grid for the split, with `lg:grid-cols-2` flipping to single-column on mobile.

**Tech Stack:** Next.js 16.2.6 · React 19.2.4 · Tailwind 4 · shadcn 4.x (Base UI, not Radix) · TypeScript

**Verification model:** This PR has no automated tests. Verification is visual via Claude in Chrome screenshots at three viewports (≥1024px desktop, ~800px tablet, ~390px mobile) plus a Lighthouse a11y pass. Each task's "verify" step lists concrete things to check in the screenshot. Future PRs (especially OAuth in PR 3) will introduce automated tests.

**Spec:** `docs/superpowers/specs/2026-05-27-pr-1-mood-board-design.md`

---

## File structure

| Path | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Edit | Add `--tor-*` and `--kett-*` CSS variables for the two palettes |
| `src/app/layout.tsx` | Edit | Import Playfair Display + JetBrains Mono, expose as CSS variables, keep existing Geist setup intact |
| `src/app/page.tsx` | Edit | Replace default scaffold with composed landing sections |
| `src/components/landing/Hero.tsx` | New | Full-viewport split hero with names, subtitles, treated photo backgrounds |
| `src/components/landing/IdentityStrip.tsx` | New | Two-column bios with shadcn Badge tags |
| `src/components/landing/QuoteClash.tsx` | New | Typographic quote section, split |
| `src/components/landing/SiteFooter.tsx` | New | Single-row footer |
| `public/images/hero-country.jpg` | New asset | Unsplash photo, ≤600KB |
| `public/images/hero-rave.jpg` | New asset | Unsplash photo, ≤600KB |

---

## Task 1: Foundation — color tokens and fonts

**Why this is first:** The palettes and fonts are shared across every component. Defining them once at the root means each component can reference `var(--tor-cream)` and `font-serif-display` without re-defining anything locally.

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

### Steps

- [ ] **Step 1.1:** Edit `src/app/globals.css` — add the two custom palettes inside the existing `:root` block. Place them at the *end* of the existing `:root` (after `--sidebar-ring`) so we don't disturb the shadcn tokens that are already there.

```css
  /* Treaty Oak Revival palette — warm/dusty */
  --tor-cream: #F4EAD5;
  --tor-rust: #9B5C3F;
  --tor-text: #1F1410;
  --tor-gold: #C99A4A;

  /* KETTAMA palette — cold/electric */
  --kett-black: #0A0A0F;
  --kett-acid: #9FFF3D;
  --kett-text: #F0F0F2;
  --kett-blue: #3D8BFF;
```

- [ ] **Step 1.2:** Edit `src/app/layout.tsx` — add two new Google Font imports alongside the existing Geist setup. Replace the file's contents with:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Treaty Oak Revival × KETTAMA",
  description: "A fanmade mood board.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 1.3:** Start the dev server and verify nothing broke.

```bash
npm run dev
```

Expected: Server boots without errors on `http://localhost:3000`. The default scaffold page still renders (we haven't touched `page.tsx` yet). Browser DevTools Network tab shows the new font files loading.

- [ ] **Step 1.4:** Commit.

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "Add mood-board palettes and Playfair/JetBrains fonts"
```

---

## Task 2: Hero component (structure + content, no photos yet)

**Why no photos yet:** Building the typographic structure first means we can verify the layout works on its own. The photos are decorative — if asset procurement (Task 3) fails, the gradient-only hero still ships. Decoupling them protects the PR.

**Files:**
- Create: `src/components/landing/Hero.tsx`
- Modify: `src/app/page.tsx`

### Steps

- [ ] **Step 2.1:** Create the directory.

```bash
mkdir -p src/components/landing
```

- [ ] **Step 2.2:** Create `src/components/landing/Hero.tsx` with the split-screen structure. The layout uses CSS Grid: `grid-cols-1` (stacked) on mobile, `lg:grid-cols-2` (split) on desktop ≥1024px.

```tsx
export function Hero() {
  return (
    <section
      aria-label="Treaty Oak Revival meets KETTAMA"
      className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2"
    >
      {/* Country side */}
      <div
        className="relative flex flex-col justify-end overflow-hidden px-8 py-16 sm:px-12 lg:py-20"
        style={{
          background:
            "linear-gradient(to bottom, var(--tor-cream) 0%, var(--tor-rust) 100%)",
          color: "var(--tor-text)",
        }}
      >
        <p
          className="mb-6 text-xs uppercase tracking-[0.3em]"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Side A · Texas
        </p>
        <h1
          className="font-black leading-[0.85] tracking-tight"
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(3.5rem, 11vw, 10rem)",
          }}
        >
          Treaty
          <br />
          Oak
          <br />
          Revival
        </h1>
        <p
          className="mt-8 text-lg sm:text-xl"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Texas. Dirt. Denim.
        </p>
      </div>

      {/* Rave side */}
      <div
        className="relative flex flex-col justify-end overflow-hidden px-8 py-16 sm:px-12 lg:py-20"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--kett-acid) 25%, transparent), transparent 55%), var(--kett-black)",
          color: "var(--kett-text)",
        }}
      >
        <p
          className="mb-6 text-xs uppercase tracking-[0.3em]"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Side B · Galway
        </p>
        <h1
          className="font-bold uppercase leading-[0.85] tracking-tight"
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "clamp(3.5rem, 11vw, 10rem)",
          }}
        >
          KETT
          <br />
          AMA
        </h1>
        <p
          className="mt-8 text-lg uppercase tracking-widest sm:text-xl"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Galway. Bass. Fog.
        </p>
      </div>

      {/* Divider label — sits on the seam between halves */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden items-center justify-center lg:flex"
      >
        <span
          className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.4em]"
          style={{
            fontFamily: "var(--font-jetbrains)",
            backgroundColor: "var(--kett-black)",
            color: "var(--kett-text)",
            borderColor: "var(--tor-gold)",
          }}
        >
          ×
        </span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2.3:** Replace `src/app/page.tsx` entirely with a thin composition file.

```tsx
import { Hero } from "@/components/landing/Hero";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
    </main>
  );
}
```

- [ ] **Step 2.4:** Save, watch dev server hot-reload, open `http://localhost:3000` in Chrome.

Verify via Claude in Chrome screenshot at **desktop width (1440px)**. Check:
- Two halves side-by-side, each ~50% wide
- Left half: cream-to-rust gradient, "Treaty Oak Revival" stacked across three lines in serif, subtitle at bottom
- Right half: near-black with acid-green corner glow, "KETTAMA" stacked across two lines in mono, subtitle at bottom
- Tiny `×` pill centered on the seam between halves
- No console errors

- [ ] **Step 2.5:** Resize Chrome to **mobile width (~390px)** and re-screenshot. Verify:
- Halves stack vertically (country on top, rave below)
- `×` pill is hidden (it's `hidden lg:flex` by design)
- Type wraps gracefully — "Treaty / Oak / Revival" stays readable
- No horizontal scroll

- [ ] **Step 2.6:** Commit.

```bash
git add src/components/landing/Hero.tsx src/app/page.tsx
git commit -m "Add split-screen Hero component (gradients only, no photos yet)"
```

---

## Task 3: Hero photo treatment

**What this adds:** Stock photos from Unsplash sit *behind* the gradient overlays, giving each half real texture. The gradients stay on top at high opacity so the text remains the focal point.

**Fallback if asset procurement fails:** Skip this entire task. The gradient-only hero from Task 2 already looks good. Update `PROGRESS.md` and the spec's "Definition of Done" to reflect skipping photos, and move on. Do not block the PR on perfect photo sourcing.

**Files:**
- Create: `public/images/hero-country.jpg`
- Create: `public/images/hero-rave.jpg`
- Modify: `src/components/landing/Hero.tsx`

### Steps

- [ ] **Step 3.1:** Create the public images directory.

```bash
mkdir -p public/images
```

- [ ] **Step 3.2:** Find a country-vibe photo on Unsplash. Use WebSearch with the query: `unsplash country concert crowd dust Americana golden hour`. Look for a landscape-orientation photo with a dusty/golden mood, ideally no clearly visible identifiable musicians (to keep this generic). Note the photo's Unsplash ID.

- [ ] **Step 3.3:** Download it. Unsplash photos are served from the CDN at `https://images.unsplash.com/photo-<UNSPLASH_PHOTO_ID>` and accept query params for width and quality. Take the photo ID found in Step 3.2 and run:

```bash
# Replace UNSPLASH_PHOTO_ID with the actual ID from Step 3.2.
# Example: if the photo's page URL is unsplash.com/photos/dust-and-sky-aB12cd34EFg,
# the ID is "aB12cd34EFg" and the download URL is:
#   https://images.unsplash.com/photo-aB12cd34EFg?w=2000&q=70&fm=jpg
curl -L "https://images.unsplash.com/photo-UNSPLASH_PHOTO_ID?w=2000&q=70&fm=jpg" \
  -o public/images/hero-country.jpg

# Verify size and that it's a real JPEG, not an HTML error page:
ls -lh public/images/hero-country.jpg
file public/images/hero-country.jpg
```

Expected: file is JPEG, ≤600KB. If larger, re-run with `?w=1600&q=60`. If `file` reports HTML, the photo ID is wrong or the photo isn't publicly hosted — pick a different photo and retry.

- [ ] **Step 3.4:** Repeat for the rave side. WebSearch: `unsplash nightclub rave fog lights crowd techno`. Same constraints — landscape, no identifiable individuals if avoidable. Download to `public/images/hero-rave.jpg`.

- [ ] **Step 3.5:** Edit `src/components/landing/Hero.tsx` to add the `<Image>` elements with the duotone treatment. Add the `import Image from "next/image"` line at the top, then inside each half, add the image BEFORE the gradient/text content, with absolute positioning. Update each half to include this structure:

For the country half (replace the existing country `<div>` block):

```tsx
{/* Country side */}
<div
  className="relative flex flex-col justify-end overflow-hidden px-8 py-16 sm:px-12 lg:py-20"
  style={{ color: "var(--tor-text)" }}
>
  <Image
    src="/images/hero-country.jpg"
    alt="Dusty open-air country show at golden hour"
    fill
    priority
    sizes="(min-width: 1024px) 50vw, 100vw"
    className="object-cover"
    style={{ filter: "grayscale(0.6) sepia(0.5) contrast(0.95)" }}
  />
  <div
    aria-hidden="true"
    className="absolute inset-0"
    style={{
      background:
        "linear-gradient(to bottom, color-mix(in oklab, var(--tor-cream) 85%, transparent) 0%, color-mix(in oklab, var(--tor-rust) 88%, transparent) 100%)",
    }}
  />
  <div className="relative">
    <p
      className="mb-6 text-xs uppercase tracking-[0.3em]"
      style={{ fontFamily: "var(--font-playfair)" }}
    >
      Side A · Texas
    </p>
    <h1
      className="font-black leading-[0.85] tracking-tight"
      style={{
        fontFamily: "var(--font-playfair)",
        fontSize: "clamp(3.5rem, 11vw, 10rem)",
      }}
    >
      Treaty
      <br />
      Oak
      <br />
      Revival
    </h1>
    <p
      className="mt-8 text-lg sm:text-xl"
      style={{ fontFamily: "var(--font-playfair)" }}
    >
      Texas. Dirt. Denim.
    </p>
  </div>
</div>
```

For the rave half (replace the existing rave `<div>` block):

```tsx
{/* Rave side */}
<div
  className="relative flex flex-col justify-end overflow-hidden px-8 py-16 sm:px-12 lg:py-20"
  style={{ color: "var(--kett-text)" }}
>
  <Image
    src="/images/hero-rave.jpg"
    alt="Foggy nightclub crowd lit by strobes"
    fill
    priority
    sizes="(min-width: 1024px) 50vw, 100vw"
    className="object-cover"
    style={{ filter: "grayscale(0.85) contrast(1.1) brightness(0.55)" }}
  />
  <div
    aria-hidden="true"
    className="absolute inset-0"
    style={{
      background:
        "radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--kett-acid) 30%, transparent), transparent 55%), color-mix(in oklab, var(--kett-black) 82%, transparent)",
    }}
  />
  <div className="relative">
    <p
      className="mb-6 text-xs uppercase tracking-[0.3em]"
      style={{ fontFamily: "var(--font-jetbrains)" }}
    >
      Side B · Galway
    </p>
    <h1
      className="font-bold uppercase leading-[0.85] tracking-tight"
      style={{
        fontFamily: "var(--font-jetbrains)",
        fontSize: "clamp(3.5rem, 11vw, 10rem)",
      }}
    >
      KETT
      <br />
      AMA
    </h1>
    <p
      className="mt-8 text-lg uppercase tracking-widest sm:text-xl"
      style={{ fontFamily: "var(--font-jetbrains)" }}
    >
      Galway. Bass. Fog.
    </p>
  </div>
</div>
```

The `relative` wrapper around the text content is required so the text sits *above* the absolutely-positioned image and overlay (stacking context).

- [ ] **Step 3.6:** Save, hot-reload, screenshot at desktop. Verify:
- Both photos are visible but heavily treated (sepia on left, near-monochrome on right)
- Color gradients sit over the photos at high opacity, so text reads cleanly
- Type contrast is still good — no text getting lost in busy photo regions
- No layout shift on load

- [ ] **Step 3.7:** Re-screenshot at mobile. Verify photos still load and gradients still dominate.

- [ ] **Step 3.8:** Commit.

```bash
git add public/images/ src/components/landing/Hero.tsx
git commit -m "Add duotone-treated photo backgrounds to Hero halves"
```

---

## Task 4: Identity strip

**What this is:** Below the hero, a second split section with 2–3 sentence bios on each side and a single `<Badge>` tag per side. Lower visual intensity than the hero — the breathing room is intentional.

**Files:**
- Create: `src/components/landing/IdentityStrip.tsx`
- Modify: `src/app/page.tsx`

### Steps

- [ ] **Step 4.1:** Create `src/components/landing/IdentityStrip.tsx`.

```tsx
import { Badge } from "@/components/ui/badge";

export function IdentityStrip() {
  return (
    <section
      aria-label="Who they are"
      className="grid grid-cols-1 lg:grid-cols-2"
    >
      {/* Country side */}
      <div
        className="flex flex-col gap-6 px-8 py-20 sm:px-12 lg:py-28"
        style={{
          backgroundColor: "var(--tor-cream)",
          color: "var(--tor-text)",
        }}
      >
        <Badge
          className="w-fit border"
          style={{
            backgroundColor: "transparent",
            color: "var(--tor-text)",
            borderColor: "var(--tor-gold)",
            fontFamily: "var(--font-playfair)",
          }}
        >
          EST. 2019 · TX
        </Badge>
        <p
          className="max-w-xl text-xl leading-relaxed sm:text-2xl"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Four sons of East Texas chasing the same broken highway outlaw country
          has always chased. Honky-tonk grit, pedal steel, and writing that
          knows how the last beer at last call tastes. Built for porch lights
          and dirt-road taillights.
        </p>
      </div>

      {/* Rave side */}
      <div
        className="flex flex-col gap-6 px-8 py-20 sm:px-12 lg:py-28"
        style={{
          backgroundColor: "var(--kett-black)",
          color: "var(--kett-text)",
        }}
      >
        <Badge
          className="w-fit border"
          style={{
            backgroundColor: "transparent",
            color: "var(--kett-acid)",
            borderColor: "var(--kett-acid)",
            fontFamily: "var(--font-jetbrains)",
          }}
        >
          LIVE · GALWAY · DUBLIN
        </Badge>
        <p
          className="max-w-xl text-xl leading-relaxed sm:text-2xl"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          Galway-born, Dublin-warehouse-shaped, club-mythology-incarnate.
          Doesn&apos;t DJ a set — detonates one. Hard-edged house with rave-era
          pulse, engineered for systems loud enough to feel in your sternum.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4.2:** Mount it in `src/app/page.tsx`.

```tsx
import { Hero } from "@/components/landing/Hero";
import { IdentityStrip } from "@/components/landing/IdentityStrip";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <IdentityStrip />
    </main>
  );
}
```

- [ ] **Step 4.3:** Save, screenshot at desktop. Verify:
- Below the hero, a new section appears with the same split structure
- Left half is cream background, badge in gold-outlined style, bio in serif
- Right half is near-black background, badge in acid-green-outlined style, bio in mono
- Section heights feel roughly equal between halves
- No console errors about the Badge component (we're using shadcn's pattern, but with style overrides)

- [ ] **Step 4.4:** Screenshot at mobile. Verify the section stacks (country on top, rave below) and both bios read cleanly.

- [ ] **Step 4.5:** Commit.

```bash
git add src/components/landing/IdentityStrip.tsx src/app/page.tsx
git commit -m "Add IdentityStrip section with bios and palette-styled Badges"
```

---

## Task 5: Quote clash

**What this is:** A purely typographic section. Each half holds one quote — country lyric on the left, rave callout on the right. The juxtaposition IS the content. The copy below is stand-in (not real lyrics).

**Files:**
- Create: `src/components/landing/QuoteClash.tsx`
- Modify: `src/app/page.tsx`

### Steps

- [ ] **Step 5.1:** Create `src/components/landing/QuoteClash.tsx`.

```tsx
export function QuoteClash() {
  return (
    <section
      aria-label="In their own voices"
      className="grid grid-cols-1 lg:grid-cols-2"
    >
      {/* Country side */}
      <div
        className="flex items-center px-8 py-24 sm:px-12 lg:py-32"
        style={{
          backgroundColor: "var(--tor-rust)",
          color: "var(--tor-cream)",
        }}
      >
        <blockquote
          className="max-w-xl text-3xl leading-tight italic sm:text-4xl lg:text-5xl"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          &ldquo;Whiskey ran the credits
          <br />
          while the porch light kept the count.&rdquo;
        </blockquote>
      </div>

      {/* Rave side */}
      <div
        className="flex items-center px-8 py-24 sm:px-12 lg:py-32"
        style={{
          backgroundColor: "var(--kett-black)",
          color: "var(--kett-acid)",
        }}
      >
        <blockquote
          className="max-w-xl text-3xl leading-tight uppercase tracking-wide sm:text-4xl lg:text-5xl"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          All city
          <br />
          all night
          <br />
          no encore.
        </blockquote>
      </div>
    </section>
  );
}
```

- [ ] **Step 5.2:** Mount it in `src/app/page.tsx` between `<IdentityStrip />` and the future footer.

```tsx
import { Hero } from "@/components/landing/Hero";
import { IdentityStrip } from "@/components/landing/IdentityStrip";
import { QuoteClash } from "@/components/landing/QuoteClash";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <IdentityStrip />
      <QuoteClash />
    </main>
  );
}
```

- [ ] **Step 5.3:** Save, screenshot at desktop. Verify:
- Below IdentityStrip, a new section appears
- Left half: rust background, cream italic serif quote with smart curly quote marks
- Right half: near-black background, acid-green uppercase mono callout
- Quotes are visually large and dominant — this is meant to be a heavy typographic moment

- [ ] **Step 5.4:** Screenshot at mobile. Verify both quotes remain legible at smaller sizes and the section stacks correctly.

- [ ] **Step 5.5:** Commit.

```bash
git add src/components/landing/QuoteClash.tsx src/app/page.tsx
git commit -m "Add QuoteClash typographic section"
```

---

## Task 6: Site footer

**What this is:** A single thin row at the bottom. Doesn't split — full width, neutral background, small text. Closes the page out without competing for attention.

**Files:**
- Create: `src/components/landing/SiteFooter.tsx`
- Modify: `src/app/page.tsx`

### Steps

- [ ] **Step 6.1:** Create `src/components/landing/SiteFooter.tsx`.

```tsx
export function SiteFooter() {
  return (
    <footer
      className="px-8 py-8 text-center text-xs uppercase tracking-[0.3em] sm:px-12"
      style={{
        backgroundColor: "var(--tor-text)",
        color: "var(--tor-cream)",
        fontFamily: "var(--font-jetbrains)",
      }}
    >
      <p>A fanmade mood board · built with shadcn · not affiliated</p>
    </footer>
  );
}
```

- [ ] **Step 6.2:** Mount it in `src/app/page.tsx`. This completes the four-section composition.

```tsx
import { Hero } from "@/components/landing/Hero";
import { IdentityStrip } from "@/components/landing/IdentityStrip";
import { QuoteClash } from "@/components/landing/QuoteClash";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <IdentityStrip />
      <QuoteClash />
      <SiteFooter />
    </main>
  );
}
```

- [ ] **Step 6.3:** Screenshot the full page top-to-bottom at desktop (use Claude in Chrome's full-page screenshot if available, else stitch two screenshots). Verify all four sections appear in order:
1. Hero (split, with treated photos)
2. Identity strip (split, bios + badges)
3. Quote clash (split, big typography)
4. Footer (full-width, dark thin row)

- [ ] **Step 6.4:** Screenshot at mobile. Verify same order, all sections stacked vertically, no horizontal scroll anywhere.

- [ ] **Step 6.5:** Commit.

```bash
git add src/components/landing/SiteFooter.tsx src/app/page.tsx
git commit -m "Add SiteFooter; complete four-section landing page composition"
```

---

## Task 7: Polish + accessibility pass

**What this is:** With all four sections in place, sweep for the details that separate "fine" from "polished" — contrast, semantic HTML, reduced-motion respect, smooth transitions.

**Files:**
- Modify: `src/app/globals.css` (add reduced-motion + base typography defaults)
- Possibly modify: any of the four landing components if specific issues surface

### Steps

- [ ] **Step 7.1:** Open the live page in Chrome, open DevTools → Lighthouse → run an **Accessibility** audit on the desktop view. Note any issues flagged.

- [ ] **Step 7.2:** If Lighthouse flags color contrast on any of the bios or labels (most likely candidate: `--tor-text` against `--tor-cream`, or the mono subtitle on the rave hero), tighten the offending color. The most likely fix: bump the small-text colors to higher contrast. Make the change and re-run Lighthouse.

- [ ] **Step 7.3:** Add a global `prefers-reduced-motion` rule to `globals.css`. Append to the existing `@layer base` block at the bottom of the file:

```css
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
```

- [ ] **Step 7.4:** Audit semantic HTML. Walk the rendered page in DevTools and confirm:
- `<main>` wraps all four sections
- Each section uses `<section>` with a meaningful `aria-label` (Hero, IdentityStrip, QuoteClash already have these)
- Footer uses `<footer>` (it does)
- The hero's H1s are not duplicated — currently Hero has two `<h1>` elements (one per side). **This is technically wrong: each page should have one `<h1>`.** Fix: change the right-side "KETTAMA" `<h1>` to `<h2>`, or wrap both in `<header>` with a single visually-hidden `<h1>` like "Treaty Oak Revival × KETTAMA mood board." Recommended: visually-hidden H1.

- [ ] **Step 7.5:** Apply the single-H1 fix in `src/components/landing/Hero.tsx`. At the top of the `<section>`, add a visually-hidden H1 and demote both visible artist names to H2:

```tsx
<section
  aria-label="Treaty Oak Revival meets KETTAMA"
  className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2"
>
  <h1 className="sr-only">Treaty Oak Revival × KETTAMA — a fanmade mood board</h1>
  {/* ...both halves below, with their <h1> changed to <h2>... */}
```

Then in both halves, find `<h1` and change it to `<h2`. (Closing tags too.)

The `sr-only` Tailwind utility hides content visually but keeps it available to screen readers and search engines.

- [ ] **Step 7.6:** Re-screenshot at desktop and mobile. Verify nothing changed visually (the H1→H2 swap should be invisible).

- [ ] **Step 7.7:** Run Lighthouse a11y again. Target score: ≥90. If still flagging things, fix inline.

- [ ] **Step 7.8:** Commit.

```bash
git add src/app/globals.css src/components/landing/Hero.tsx
git commit -m "Polish: reduced-motion override, single H1, contrast tightening"
```

---

## Task 8: Housekeeping, PR, review, merge

**What this is:** Ship it. Fold in the leftover uncommitted files from last session, open the PR, run self-review, address findings, merge, verify the live deploy.

**Files:**
- Modify: `PROGRESS.md` (tick PR 1 boxes)
- (Already untracked) `docs/handoffs/session-2.md` (gets committed with this PR)

### Steps

- [ ] **Step 8.1:** Open `PROGRESS.md` and tick the checkboxes for PR 1 that have been completed. At minimum:
- `Create a feature branch`
- `Brainstorm`
- `Plan`
- `Execute`
- `Verify`
- `Commit`
- `Open a PR` (after step 8.3)
- The rest get ticked as we go through review/merge

- [ ] **Step 8.2:** Commit the housekeeping.

```bash
git add PROGRESS.md docs/handoffs/session-2.md
git commit -m "Tick PR 1 progress + include session-2 handoff"
```

- [ ] **Step 8.3:** Push the branch and open the PR.

```bash
git push -u origin pr-1-landing-page
gh pr create --base main --head pr-1-landing-page --title "PR 1 — Treaty Oak Revival × KETTAMA mood board landing page" --body "$(cat <<'EOF'
Playground PR. Builds a split-screen mood-board landing page that contrasts Treaty Oak Revival (Texas country) with KETTAMA (Irish rave). Four sections — hero with treated photo backgrounds, identity bios, typographic quote clash, footer.

Spec: docs/superpowers/specs/2026-05-27-pr-1-mood-board-design.md
Plan: docs/plans/pr-1-mood-board.md

## What's in
- Two custom palettes as CSS variables in globals.css (warm/dusty + cold/electric)
- Playfair Display + JetBrains Mono via next/font/google
- Four section components under src/components/landing/
- shadcn Badge used on the identity strip; no other shadcn primitives needed for this design
- Responsive: vertical split ≥1024px, stacked single-column below
- A11y: semantic landmarks, visually-hidden H1, prefers-reduced-motion respected, Lighthouse a11y ≥90

## Verification
Visual via Claude in Chrome at three viewports (desktop 1440px, tablet 800px, mobile 390px). No automated tests in this PR — PR 3 (OAuth) will introduce them.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 8.4:** Run self-review on the PR.

```bash
gh pr view --json url --jq .url
```

Note the PR URL, then in this Claude session run `/code-review` against the PR. Read the findings together with Will. For each finding:
- Is it a real correctness issue? → fix it
- Is it style or preference? → discuss with Will, decide
- Is it out of scope (PR 2 or 3 territory)? → ignore with a comment

Apply fixes in new commits on the same branch. Push with `git push`.

- [ ] **Step 8.5:** Merge the PR on github.com (Will clicks the green Merge button). After merge, Vercel auto-deploys.

- [ ] **Step 8.6:** Visit the live URL (https://spotify-wrapped-lemon.vercel.app/) and verify the mood board is live. Take a final screenshot to celebrate.

- [ ] **Step 8.7:** Tick the final remaining boxes in `PROGRESS.md` on `main` (open the file, change `- [ ]` to `- [x]` for the merge / deploy / handoff steps). Commit on `main` as a tiny direct fast-forward, OR open a tiny housekeeping PR — either is fine, Will picks.

- [ ] **Step 8.8:** End the session with a manual handoff doc at `docs/handoffs/session-3.md` (Will builds the `/handoff` skill in PR 3, so manual until then). Capture: where we ended, what's live, what's next.

---

## Decision log (for transparency)

- **Stand-in lyric copy** rather than real lyrics: real lyrics are copyrighted and risky on a public deploy. The originals capture the vibe.
- **Single shadcn primitive (`Badge`)** rather than forcing more in: the design didn't call for `Card` or `Button`; ceremonial usage would be worse than judicious usage. PR 2 will use many more.
- **Photos optional (Task 3 has a documented skip path):** procurement can fail for reasons outside Claude's control (no good results, file too big). The gradient-only hero already ships polished. Don't block the PR on photo perfection.
- **No automated tests in this PR:** verification is visual via Claude in Chrome. Per `CLAUDE.md`, automated tests come in starting at PR 3 (OAuth).
- **Inline `style={{ fontFamily: ... }}` rather than Tailwind font utilities:** Tailwind 4's `font-*` utilities are defined globally in `globals.css` `@theme inline`. To avoid editing that block (which would mean touching the existing shadcn token system), we use inline style for the two new fonts. This is contained to a few section components and is a small, isolated cost.
