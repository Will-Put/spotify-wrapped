# Session 1 — Setup complete (Section 0 done)

**Date:** 2026-05-27
**Duration:** Long. Lots of install steps, one real curveball.

## Where Will is in PROGRESS.md

- **Sections 0.1 through 0.8: ✅ all done.**
- **Next:** Section 1 — Scaffold your project. Open a fresh session and ask "what's next?" — Claude should land on Section 1.1.

## What got installed and verified

- **Homebrew** 5.1.14 — Will ran the installer manually in Terminal (interactive, needed Mac password).
- **Node.js** v26.0.0 + **npm** 11.12.1 — installed via brew.
- **Git** — was already on the system (Apple Git 2.50.1).
- **Zed** — installed by Will manually from zed.dev. Project folder opened, trusted, `PROGRESS.md` and `CLAUDE.md` are both visible in the file tree.
- **GitHub CLI** (`gh`) 2.92.0 — installed via brew, authenticated as **`Will-Put`** (https://github.com/Will-Put). Token scopes: `gist`, `read:org`, `repo`, `workflow`.
- **Superpowers plugin** — see notable quirk below.
- **Claude in Chrome** — extension installed, connected to browser named **"Collin Project"** (Will renamed it during the connect prompt). Navigate confirmed working; reading page content needs per-domain approval.
- **Vercel account** — created via GitHub OAuth. **Vercel CLI** 54.5.0 installed globally via npm.
- **Claude Code 101 video** — Will watched it already.

## Notable quirks for next time

### Superpowers install path was non-obvious

Will's Claude Code is the desktop app build, where `/plugin install superpowers@claude-plugins-official` returns `not available in this environment` and the Plugin Directory UI only shows Anthropic-curated plugins (Superpowers isn't in that curated set). After spending time on this, Will pinged Collin, got on a quick call, and Collin walked him through a terminal-based install. Exact command was not captured — **worth asking Collin for the literal command and writing it into `PROGRESS.md` Section 0.4 so future-Will doesn't repeat the detour.**

(Claude also cloned the repo to `~/.claude/plugins/superpowers/` as a Hail Mary before the Collin call. Probably not what's actually loading the skills, but it's harmless if left alone.)

### Box-ticking format

Will tripped on this once — the format is `[x]` (no space), not `[ x]` (space + x). GitHub-flavored markdown only renders the no-space version as a checked box. Habit's locked in now but worth noting if it happens again.

### Network quirk

`example.com` failed DNS lookup during the Claude in Chrome test (`DNS_PROBE_FINISHED_NXDOMAIN`). Will was on the WFU campus network at the time, plus had a phone hotspot toggled earlier in the session. Not a real problem — `localhost:3000` won't hit DNS, and other sites will resolve fine.

### Read-only PROGRESS.md

`PROGRESS.md` and `CLAUDE.md` shipped with mode `400` (read-only). Claude `chmod 644`'d both so Will could tick boxes. Future-Will: the files are editable now, don't need to fix again.

## What to do next session

1. Will opens this folder, asks "what's next?"
2. Read `PROGRESS.md` Section 1.1.
3. First task: scaffold a Next.js app in this folder via `npx create-next-app@latest .` (do NOT delete `CLAUDE.md`, `PROGRESS.md`, or `docs/`).
4. Initialize shadcn/ui, install Button + Card + Badge.
5. Run dev server, confirm the default Next.js page renders.
6. Push to GitHub (`gh repo create`), turn on branch protection for `main`.
7. Link the repo to Vercel, confirm first deploy works.

That's all of Section 1. PR 1 (the wow-factor static landing page) starts after that.

## Important context to carry forward

- Will is day-zero on code. Reinforce "apps are files in folders" constantly. Narrate which file you're editing and why.
- shadcn/ui from day 1. No hand-rolled buttons or cards.
- Workflow spine: brainstorm → plan → execute → verify → PR → review. Don't skip steps.
- Will builds his own `/handoff` skill at PR 3. Until then, manual handoff files like this one.
- Collin is reachable. Use him for off-script blockers.
