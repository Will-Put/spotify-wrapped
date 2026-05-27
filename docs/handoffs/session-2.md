# Session 2 — Section 1 complete (scaffolded, pushed, deployed)

**Date:** 2026-05-27
**Duration:** Medium-long. One real curveball (folder name), one paywall (branch protection).

## Where Will is in PROGRESS.md

- **Section 1.1–1.4: ✅ all done.**
- **Section 2 (Spotify Developer setup): not started.** Can happen next session or any time before PR 3.
- **PR 1 (wow-factor landing page): not started.** Curriculum says PR 1 doesn't need Spotify yet — fake data only.
- **Next session:** ask "what's next?" — Claude can either knock out Section 2 first or jump straight into PR 1 (Will's call). PR 1 has no hard dependency on Section 2.

## Repo / deployment state

- **Local working directory:** `/Users/williamputman/Documents/Claude/Projects/App Builder From Colin/` (still named "App Builder From Colin" — the app package itself is `spotify-wrapped` per `package.json`)
- **GitHub repo:** [github.com/Will-Put/spotify-wrapped](https://github.com/Will-Put/spotify-wrapped) (**public**)
- **Live URL:** [spotify-wrapped-lemon.vercel.app](https://spotify-wrapped-lemon.vercel.app)
- **Vercel project:** `spotify-wrapped` under `Will Putman's projects`
- **Branch protection on `main`:** Active ruleset "Project main" enforces (1) restrict deletions, (2) block force pushes, (3) require PR before merging (0 required approvals — solo workflow)
- **Default branch:** `main`
- **Git identity:** `Will Putman <putmwh25@wfu.edu>` (configured globally — may want to migrate to GitHub no-reply email later if privacy matters)

## What got built / verified

- **Next.js 16.2.6** with App Router, TypeScript, Tailwind v4, ESLint, `src/` directory, `@/*` import alias
- **shadcn/ui** initialized (components.json, `src/lib/utils.ts` with `cn` helper, globals.css with CSS variables)
- **shadcn components installed:** Button, Card, Badge in `src/components/ui/`
- **Dev server confirmed** running on `localhost:3000` (Turbopack, ready in 230ms)
- **Production deploy confirmed** working at `spotify-wrapped-lemon.vercel.app`

## Notable quirks / things to know

### create-next-app folder name conflict

`create-next-app .` rejects folder names with spaces and capitals. Workaround applied: scaffolded into `spotify-wrapped/` subfolder, then `rsync -a` moved everything up to the root and removed the subfolder. **Side effect:** rsync overwrote Will's teaching `CLAUDE.md` (9.5KB) with the scaffold's stub (11 bytes). Recovered by restoring from session context. Lesson logged: check for filename collisions before rsync into a non-empty directory.

### CLAUDE.md now imports AGENTS.md

The scaffold shipped its own `AGENTS.md` (warns agents that Next.js 16 has breaking changes from training data — read `node_modules/next/dist/docs/` before writing Next.js code). Added `@AGENTS.md` line at the end of `CLAUDE.md` so it auto-loads with the project instructions.

### Private repo → branch protection paywall

Will initially picked private repo. GitHub gates Rulesets enforcement on private repos behind GitHub Team ($4/user/month). Flipped to public via `gh repo edit Will-Put/spotify-wrapped --visibility public` after Will agreed. Ruleset now enforces. Note for PR 3: when Spotify keys come in, they MUST go in `.env.local` (gitignored), never in committed code.

### Two commits on `main`

1. `Initial commit from Create Next App` (auto from scaffold; included a stub CLAUDE.md that got overwritten)
2. `Complete Section 1.1: shadcn/ui scaffold + restore curriculum docs` — restored CLAUDE.md, added PROGRESS.md/docs/, all shadcn files

### Dev server background process

A `npm run dev` process was started in this session as a Claude Code background bash job. It may still be running when the session ends. No harm; future sessions can just start a fresh one. If Will wants to verify nothing's stuck on port 3000 next session, ask Claude to `lsof -i :3000` and kill if needed.

### Uncommitted file on session end

This handoff file (`docs/handoffs/session-2.md`) is written but NOT committed/pushed yet — because branch protection on `main` blocks direct pushes. Next session it can either (a) get committed along with whatever PR 1 work happens, or (b) be its own tiny PR for handoff-doc hygiene. Either is fine.

## What to do next session

1. Will opens this folder, asks "what's next?"
2. Read this handoff + `PROGRESS.md`.
3. Confirm with Will: jump into Section 2 (Spotify dev setup, ~10–15 min of clickthrough), or skip ahead to PR 1 (wow-factor landing page, the first real workflow loop).
4. If PR 1: start with `/superpowers:brainstorming` to nail down what the page should look like. Don't open the editor until the brainstorm is locked.
5. First feature branch should be `pr-1-landing-page`.

## Important context to carry forward

- Will is day-zero on code. Reinforce "apps are files in folders" constantly. Narrate which file you're editing.
- shadcn/ui from day 1. No hand-rolled buttons or cards.
- Workflow spine: brainstorm → plan → execute → verify → PR → review. Don't skip steps.
- Will builds his own `/handoff` skill at PR 3. Until then, manual handoff files like this one.
- Collin is reachable. Use him for off-script blockers.
- The branch protection is real now — first push from a feature branch will need a PR to merge. That's by design.
