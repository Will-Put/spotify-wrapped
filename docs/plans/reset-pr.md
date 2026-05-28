# Reset PR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the PR 1 mood board and PR 2 fake dashboard back to a clean Next.js + shadcn skeleton, with `/` showing a quiet "Log in with Spotify" stub. Phase 2 (OAuth) starts from this state.

**Architecture:** Six small commits on `reset-playground`: stub the home page → delete landing components → delete dashboard route + components + fake data → clean up layout fonts/metadata → clean up globals.css palette tokens → tick PROGRESS.md and include the session-5 handoff in the wrap-up commit. Each commit leaves the app in a working, deployable state.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui. No test framework — verification is `npm run build`, `npm run lint`, dev server + Claude in Chrome screenshots.

**Spec:** [docs/superpowers/specs/2026-05-27-reset-pr-design.md](../superpowers/specs/2026-05-27-reset-pr-design.md)

**Prereq:** Already on the `reset-playground` branch (created during brainstorming when the spec was committed). Confirm with `git branch --show-current` — should print `reset-playground`.

---

## Task 1: Stub the home page

Replace the current `src/app/page.tsx` (which composes four landing components) with a centered shadcn `<Card>` containing the disabled "Log in with Spotify" button. This task touches one file and leaves the now-orphaned landing components in place — they get deleted in Task 2.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx` with the stub**

```tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Spotify Wrapped</CardTitle>
          <CardDescription>
            Your listening, your year. Coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="w-full">
            Log in with Spotify
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Start the dev server and confirm the stub renders**

Run: `npm run dev`
Open: `http://127.0.0.1:3000`
Expected: a single centered card with the title "Spotify Wrapped", the tagline below it, and a disabled "Log in with Spotify" button filling the card width. The orphaned landing components don't render (the stub doesn't import them) — they just sit on disk until Task 2.

Take a Claude in Chrome screenshot. Compare against the spec — is the visual quiet (no custom palette/fonts bleeding through)? If yes, proceed. If something looks off, fix and re-verify before committing.

Stop the dev server (Ctrl+C) before committing.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Stub / with a 'Log in with Spotify' card

Replace the PR 1 mood board composition with a quiet centered card.
Disabled Button placeholder — PR 3 wires the OAuth handler.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Delete the landing components

Remove the four PR 1 components and the empty directory. Nothing imports them anymore (Task 1 stubbed the only consumer).

**Files:**
- Delete: `src/components/landing/Hero.tsx`
- Delete: `src/components/landing/IdentityStrip.tsx`
- Delete: `src/components/landing/QuoteClash.tsx`
- Delete: `src/components/landing/SiteFooter.tsx`
- Delete: `src/components/landing/` (empty directory)

- [ ] **Step 1: Delete the four files and the directory**

```bash
rm src/components/landing/Hero.tsx
rm src/components/landing/IdentityStrip.tsx
rm src/components/landing/QuoteClash.tsx
rm src/components/landing/SiteFooter.tsx
rmdir src/components/landing
```

`rmdir` only removes the directory if it's empty — if it errors, something else lives in there and you should look at what's left before continuing.

- [ ] **Step 2: Confirm nothing references the deleted files**

Run: `grep -r "components/landing" src/ 2>/dev/null`
Expected: no output (no remaining imports).

- [ ] **Step 3: Run the build to catch any lingering import errors**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors. The output may print page sizes for `/` and other Next.js boilerplate routes.

- [ ] **Step 4: Commit**

```bash
git add -A src/components/landing
git commit -m "Delete PR 1 landing components

Hero, IdentityStrip, QuoteClash, SiteFooter are no longer imported
after the / stub. Remove them and their now-empty directory.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Note: `git add -A` is used here so the deletions are picked up — `git add <path>` doesn't stage deletions of files that no longer exist.

---

## Task 3: Delete the dashboard route, components, and fake data

Remove the PR 2 dashboard entirely — the route file, the five card components, the fake data module, and all three now-empty directories.

**Files:**
- Delete: `src/app/dashboard/page.tsx`
- Delete: `src/app/dashboard/` (empty directory)
- Delete: `src/components/dashboard/HeroCard.tsx`
- Delete: `src/components/dashboard/TopArtistsCard.tsx`
- Delete: `src/components/dashboard/TopTracksCard.tsx`
- Delete: `src/components/dashboard/GenreCard.tsx`
- Delete: `src/components/dashboard/PersonalityCard.tsx`
- Delete: `src/components/dashboard/` (empty directory)
- Delete: `src/lib/fake-spotify-data.ts`

- [ ] **Step 1: Delete the route, components, and fake data**

```bash
rm src/app/dashboard/page.tsx
rmdir src/app/dashboard
rm src/components/dashboard/HeroCard.tsx
rm src/components/dashboard/TopArtistsCard.tsx
rm src/components/dashboard/TopTracksCard.tsx
rm src/components/dashboard/GenreCard.tsx
rm src/components/dashboard/PersonalityCard.tsx
rmdir src/components/dashboard
rm src/lib/fake-spotify-data.ts
```

- [ ] **Step 2: Confirm nothing references the deleted modules**

Run: `grep -rE "components/dashboard|fake-spotify-data|app/dashboard" src/ 2>/dev/null`
Expected: no output.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: build succeeds. The `/dashboard` route should no longer appear in the build output's list of routes.

- [ ] **Step 4: Spot-check the 404 in dev**

Run: `npm run dev`
Open: `http://127.0.0.1:3000/dashboard`
Expected: Next.js's default 404 page (the route is gone, so the framework serves its built-in not-found UI). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/dashboard src/components/dashboard src/lib/fake-spotify-data.ts
git commit -m "Delete PR 2 dashboard route, components, and fake data

The /dashboard route and its five card components served their
purpose (teaching shadcn Card composition and filesystem routing).
PR 4+ will rebuild the dashboard with real Spotify data on /.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Clean up `src/app/layout.tsx`

Strip the PR 1 fonts (Playfair Display, JetBrains Mono) and update the metadata title/description. Keep Geist Sans + Geist Mono (the Next.js scaffold defaults).

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace `src/app/layout.tsx` entirely**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spotify Wrapped",
  description: "See your Spotify listening as a Wrapped-style dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

What changed from the previous version:
- Removed `Playfair_Display` and `JetBrains_Mono` from the `next/font/google` import
- Removed the `playfair` and `jetbrains` `const` declarations
- Removed `${playfair.variable}` and `${jetbrains.variable}` from the `<html>` className
- `title` changed from `"Treaty Oak Revival × KETTAMA"` to `"Spotify Wrapped"`
- `description` changed from `"A fanmade mood board."` to `"See your Spotify listening as a Wrapped-style dashboard."`

The `<body>` structure (`min-h-full flex flex-col`) is unchanged — the stub from Task 1 relies on it for vertical filling.

- [ ] **Step 2: Run the build to confirm no font-related errors**

Run: `npm run build`
Expected: build succeeds. No warnings about unused fonts.

- [ ] **Step 3: Spot-check in dev**

Run: `npm run dev`
Open: `http://127.0.0.1:3000`
Expected: the stub renders the same as before (the stub uses default text sizing, not the removed fonts, so visually nothing changes). The browser tab title now reads "Spotify Wrapped". Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "Reset layout: drop PR 1 fonts and update metadata

Remove Playfair Display + JetBrains Mono imports — they were
PR 1-specific typography. PR 3+ will choose its own. Update the
tab title and meta description to reflect what the app actually is.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Clean up `src/app/globals.css`

Remove the three custom palette comment blocks (PR 1's Treaty Oak + KETTAMA, PR 2's burnt-orange). Everything else in the file is shadcn theme tokens that PR 3+ needs.

**Files:**
- Modify: `src/app/globals.css` (delete lines 85–101 in the current file)

- [ ] **Step 1: Open `src/app/globals.css` and remove the palette section**

Find this block (currently lines 85–101, sitting between `--sidebar-ring: oklch(0.708 0 0);` and the closing `}` of `:root`):

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

  /* PR 2 burnt-orange signature palette */
  --orange-flame: #FF4500;
  --orange-deep:  #1A0500;
  --orange-cream: #FFE8D6;
  --orange-mid:   #C2360F;
```

Delete the entire block (including the leading blank line). After the edit, `--sidebar-ring: oklch(0.708 0 0);` should be followed directly by the closing `}` of the `:root` block (with no blank line, matching the style of the rest of the file's tokens).

- [ ] **Step 2: Confirm nothing in `src/` references the deleted tokens**

Run: `grep -rE "(--tor-|--kett-|--orange-)" src/ 2>/dev/null`
Expected: no output. (If any reference shows up, that means a component we thought was deleted is still around — investigate before continuing.)

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: build succeeds with no CSS warnings.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no errors. If there are warnings about unused imports anywhere, fix them before committing.

- [ ] **Step 5: Spot-check in dev**

Run: `npm run dev`
Open: `http://127.0.0.1:3000`
Expected: the stub still renders correctly. Take a final Claude in Chrome screenshot — this is the visual state PR 3 will start from.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "Strip playground palette tokens from globals.css

Remove the --tor-*, --kett-*, and --orange-* custom palette
variables. Only the shadcn theme tokens remain.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Tick PROGRESS.md and include the session-5 handoff

The Reset section in [PROGRESS.md](../../PROGRESS.md) has four checkboxes. Tick them. Also commit [docs/handoffs/session-5.md](../handoffs/session-5.md), which has been sitting untracked since session 5 — its own notes specify it rides along with the Reset PR's wrap-up commit.

**Files:**
- Modify: `PROGRESS.md` (tick four checkboxes in the "Reset → Phase 2" section)
- Add: `docs/handoffs/session-5.md` (already exists untracked)

- [ ] **Step 1: Tick the four Reset checkboxes in PROGRESS.md**

Find the "Reset → Phase 2" section. The four lines currently read:

```markdown
- [ ] **Start a fresh session.** Tell Claude: "We're done with the playground. Reset the app to a clean Next.js + shadcn skeleton — delete the landing page and the fake dashboard."
- [ ] Claude will guide you through removing the playground code and getting back to a clean state on a branch.
- [ ] **Open a PR for the reset, merge it.** Treat the reset itself as a PR.
- [ ] **Run `/handoff`.**
```

Change all four `- [ ]` to `- [x]`. Leave the rest of the text in each line unchanged.

- [ ] **Step 2: Stage and commit both files together**

```bash
git add PROGRESS.md docs/handoffs/session-5.md
git commit -m "Reset PR wrap-up: tick PROGRESS.md + include session-5 handoff

Tick the four Reset section checkboxes and the End-of-Section-2
handoff box. Bring session-5.md into the tree — session 5's notes
specify it rides along with this PR's wrap-up commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## After all tasks: the PR loop continues

These steps are outside the plan but worth listing so the engineer knows what comes next:

1. **Push the branch:** `git push -u origin reset-playground`
2. **Open the PR:** use a body roughly like the template below — adjust if execution surfaced anything worth calling out.

   ```
   Resets the app to a clean Next.js + shadcn skeleton ahead of PR 3 (OAuth).

   - Deletes the PR 1 landing components and the PR 2 dashboard route + components + fake data
   - Replaces `/` with a centered "Log in with Spotify" stub (disabled — PR 3 wires the handler)
   - Strips PR 1 fonts (Playfair, JetBrains Mono) and the `--tor-*`/`--kett-*`/`--orange-*` palette tokens
   - Includes session-5's handoff doc

   Spec: docs/superpowers/specs/2026-05-27-reset-pr-design.md
   Plan: docs/plans/reset-pr.md
   ```

   Open with: `gh pr create --base main --head reset-playground --title "Reset PR — strip the playground" --body-file <path-to-temp-file>` (or just paste into github.com after `gh pr create --web`).
3. **Self-review:** run `/code-review` on the open PR. Read the findings. Address anything real; ignore noise.
4. **Merge:** once the review is clean, merge on github.com.
5. **Confirm Vercel auto-deploy:** visit [spotify-wrapped-lemon.vercel.app](https://spotify-wrapped-lemon.vercel.app/). Should show the new stub. `/dashboard` should 404.
6. **End the session** with the manual handoff pattern (Will's own `/handoff` skill gets built in PR 3).

---

## Verification summary

By the end of this plan, the following should be true:

- `npm run build` succeeds with zero errors and zero warnings
- `npm run lint` succeeds with zero errors
- Dev server renders the stub at `/` — centered card, "Spotify Wrapped" title, disabled "Log in with Spotify" button
- `/dashboard` returns the Next.js default 404
- Browser tab title is "Spotify Wrapped"
- No console errors in the dev tools
- `src/components/landing/` and `src/components/dashboard/` no longer exist
- `src/lib/fake-spotify-data.ts` no longer exists
- `src/app/dashboard/` no longer exists
- `src/app/layout.tsx` imports only Geist + Geist_Mono
- `src/app/globals.css` contains no `--tor-*`, `--kett-*`, or `--orange-*` tokens
- The Reset checkboxes in PROGRESS.md are ticked
- `docs/handoffs/session-5.md` is committed (no longer untracked)
- The `reset-playground` branch has six commits on top of `main`

If any of the above isn't true, something went wrong — stop and investigate before opening the PR.
