# Session 5 — Section 2 done (Spotify Developer setup)

**Date:** 2026-05-27
**Duration:** Short session. One sub-task only: walk Will through registering his Spotify Developer app + saving credentials.

## Where Will is in PROGRESS.md

- **Section 0–1: ✅ done** (prior sessions)
- **Section 2 (Spotify Developer setup): ✅ DONE this session.**
- **PR 1 (landing page): ✅ shipped & live at [`/`](https://spotify-wrapped-lemon.vercel.app/)**
- **PR 2 (fake dashboard): ✅ shipped & live at [`/dashboard`](https://spotify-wrapped-lemon.vercel.app/dashboard)**
- **Reset PR: 🔜 NEXT.** This is what next session opens with.
- **PR 3 (OAuth): blocked on Reset PR only.** Section 2 dependency now satisfied.

## What got done this session

- **Spotify Developer app registered** as "Spotify Wrapped"
  - **Redirect URIs configured:**
    - `http://127.0.0.1:3000/api/auth/callback` (local dev)
    - `https://spotify-wrapped-lemon.vercel.app/api/auth/callback` (production)
  - **APIs:** Web API only
  - **App Status:** Development mode (only Will + up to 25 invited users can log in until PR 10's Extended Quota Mode submission)
- **Credentials stored in Will's password manager** as "Spotify Wrapped — Developer App"
  - Client ID (public, also visible on the Spotify dashboard if needed): `eca7a4a0621c4b0e8107aa042f03b7d5`
  - Client Secret: only in Will's password manager. Never seen by Claude, never in this repo.
- **PROGRESS.md ticks bundled into PR #4** ("PR 2 wrap-up + Section 2") which merged in commit `112577b`. Also fixed a `- []` typo on the gh CLI line in Section 0.3 while in there.
- **Updated PROGRESS.md** to document the `127.0.0.1` requirement (was previously instructing future readers to use `localhost`, which Spotify no longer accepts).

## ⚠️ Critical thing to remember for PR 3

**Spotify rejects `localhost` in redirect URIs now.** They require the literal loopback IP `127.0.0.1`. This applies in two places when PR 3 happens:

1. The OAuth redirect URI you build into the app must be `http://127.0.0.1:3000/api/auth/callback` (NOT `http://localhost:3000/api/auth/callback`).
2. When Will tests OAuth locally, he must visit `http://127.0.0.1:3000` in his browser, NOT `http://localhost:3000`. Otherwise the redirect URI won't match what's registered with Spotify and the flow will fail with a `redirect_uri mismatch` error.

This is exactly the kind of thing that wastes 45 minutes if you forget. The PR 3 plan should call this out at the top.

## Where the Spotify credentials live (for PR 3)

When PR 3 needs to load these into `.env.local`:

- **Client ID** is in Will's password manager AND visible on the Spotify dashboard at https://developer.spotify.com/dashboard (click "Spotify Wrapped" → Basic Information). Public value, safe.
- **Client Secret** is in Will's password manager only. The Spotify dashboard requires a "View client secret" click to re-reveal it.

The env var names PR 3 should use (standard convention):
```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback   # dev
# Production gets the Vercel URL version, set via Vercel dashboard env vars, not committed
```

These should land in `.env.local` (gitignored by Next.js default) for local dev, and in Vercel's project env settings for production. NEVER commit either value.

## What this handoff is doing in the working tree (uncommitted)

This file is uncommitted on purpose. Established pattern from session-4: handoff docs ride along with the next natural wrap-up commit, not their own PR. The next natural wrap-up is the Reset PR. When the Reset PR is being prepared, this file gets included in that PR alongside the PROGRESS.md ticks for the reset.

If something weird happens and the next session starts but doesn't see this file (git checkout, sync issue, whatever) — it WILL be in the working tree. Will should run `git status` if confused; this file should show as untracked.

## What to do next session

1. **Will opens this folder, asks "what's next?"**
2. **Read this handoff + PROGRESS.md.** The next unchecked thing in PROGRESS.md is the Reset section (lines ~244–252).
3. **Reset PR.** The exact playbook from PROGRESS.md: *"Tell Claude: 'We're done with the playground. Reset the app to a clean Next.js + shadcn skeleton — delete the landing page and the fake dashboard.'"*
4. **Spec/plan/execute scope (loosely):**
   - Delete the four PR 1 landing components (`src/components/landing/*`)
   - Delete the five PR 2 dashboard components (`src/components/dashboard/*`)
   - Delete `src/lib/fake-spotify-data.ts`
   - Delete `src/app/dashboard/page.tsx` and probably `src/app/dashboard/` entirely
   - Restore `src/app/page.tsx` to either the default Next.js scaffold OR a minimal "Coming soon — log in with Spotify" landing
   - Remove the `--tor-*`, `--kett-*`, and `--orange-*` palette tokens from `globals.css`
   - Possibly remove Playfair Display + JetBrains Mono font imports from `layout.tsx` (PR 3 will decide its own typography)
   - Tick the Reset section in PROGRESS.md
   - Include this `session-5.md` file in the Reset PR's wrap-up commit
5. **After Reset merges, PR 3 (OAuth) begins.** That PR also unlocks the building of Will's own `/handoff` skill — so this is the **last manual handoff doc**.

## Notes for the Reset PR planning

- **Don't get attached to the playground code.** It served its purpose (taught Will the workflow, the shadcn primitives, the deploy loop). The patterns carry forward; the literal files do not.
- **shadcn primitives stay installed.** `Card`, `Badge`, `Button` — keep them. PR 3+ will use them.
- **Next.js scaffold stays.** Don't touch `src/app/layout.tsx` more than necessary. Don't touch `package.json` unless removing a font import demands it.
- **The Reset PR should be small and obvious.** Mostly deletions, one file restoration. If it's getting big, something's wrong.
- **Worth a quick brainstorm even though scope is clear:** Will should think about whether `/` after reset shows the default Next.js page (boring but honest) OR a minimal "Log in with Spotify" CTA stub (more excited, hints at what's coming). The CTA stub is the better hook — it makes the live URL feel like "an app in progress" instead of "empty scaffold."

## Repo / deployment state at end of session 5

- **`main` HEAD:** `112577b` ("PR 2 wrap-up + Section 2 (Spotify Developer setup) (#4)")
- **Branches:** only `main` locally and remotely. `pr-2-wrapup` was merged + deleted as part of PR #4.
- **Live URLs unchanged** (Section 2 was non-code):
  - [`/`](https://spotify-wrapped-lemon.vercel.app/) — PR 1 mood board
  - [`/dashboard`](https://spotify-wrapped-lemon.vercel.app/dashboard) — PR 2 dashboard
- **Branch protection on `main`:** active (via modern ruleset "Project main" — uses GitHub's newer ruleset API, not the classic branch-protection one). Direct pushes blocked. PR workflow enforced.
- **Open PRs:** none.

## Important context to carry forward

- **Today's date:** 2026-05-27. Orient future date references from here.
- **Will's Vercel project:** `spotify-wrapped` under team/scope `will-putman-s-projects`. Stable production URL is `https://spotify-wrapped-lemon.vercel.app`.
- **The Vercel CLI is linked.** `vercel ls`, `vercel project ls`, `vercel env` etc. all work from the repo root.
- **There's an unresolved `.claude/settings.json` task** carried over from session 4 — adding read-only MCP tool allowlist to reduce permission prompts. Not blocking; Will can address whenever. See session-4.md "Things deliberately deferred" for the specific tool list.
- **Screen Recording permission for computer-use MCP** also still deferred from session 4 — needs Claude desktop restart to take effect.
