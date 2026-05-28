# Spotify Wrapped Capstone — Will's Path

Hey Will. Collin sent you here. This file is your map.

## What this is

You're going to build a real, deployed web app that pulls your Spotify listening data and shows it as a Wrapped-style dashboard — top tracks, top artists, genre breakdown, listening time, all of it. You'll log in with your own Spotify account, see your real data, and have a public URL you can share with anyone.

You're not going to be writing the code yourself. Claude does the typing — including running terminal commands, installing things, creating files, all of it. **You do not need to learn terminal commands or syntax.** Your job is to direct Claude, evaluate what it produces, and ship it. That's the actual skill — not "how to code," but "how to build software with AI doing the heavy lifting." That's the valuable thing now.

The point of this capstone is for you to come out with the muscle to build your own stuff. Whether that's a class project, a side hustle, or the next billion-dollar thing — once you can ship, you can ship.

## How to use this file

- Open this file in Zed (the code editor you'll install in a minute) so you can see it and tick boxes
- Work through it top to bottom — don't skip
- Tick `- [ ]` boxes by changing them to `- [x]` as you finish each thing
- When you don't know what to do, ask Claude: **"what's next?"** — it'll read this file and tell you
- When you finish a session, run `/handoff` (or ask Claude to write you one) so the next session knows where you left off

There's a companion file in this folder called `CLAUDE.md`. You don't need to open it. Claude reads it automatically every time you start a session. It tells Claude how to teach you, what skills to use, and what the rules are.

## Permission to riff

The 10-PR roadmap below is a suggested path, not a contract. If something in the middle sparks for you and you want to take a detour, do it. If you want to add a feature that's not on the list, add it. If you're curious about something and want to chase it, chase it.

What you DO want to stick to:
- The workflow loop inside each PR (brainstorm before code, plan before execute, verify before commit)
- shadcn/ui for every component (the design discipline matters)
- One PR = one focused thing (don't pile six features into one PR)

Following dopamine is how good projects happen. The destination is flexible. The process keeps you from making slop.

And if you ever feel genuinely stuck or unsure, text Collin. He's not going to bite. That's why he's there.

## The big picture

You'll go through 10 PRs (Pull Requests — small, reviewable chunks of work):
- **PR 1–2:** Playground. Static front-end work with fake data. The point is to learn the tools and the workflow.
- **PR 3–10:** The real build. OAuth login, then progressively pulling and displaying your real Spotify data.

After PR 2, you'll **delete the playground code and start fresh on the real app.** Don't worry — the muscle memory stays even when the code doesn't.

Each PR follows the same loop:
1. Brainstorm what you're building → 2. Write a plan → 3. Claude executes → 4. You verify → 5. Open a PR → 6. Self-review → 7. Merge → 8. Hand off the session

Don't try to memorize that loop right now. You'll do it 10 times. By PR 3 it'll be automatic.

---

# Section 0 · Get Yourself Set Up

You're at the very beginning. You have two markdown files in a folder, and you opened that folder in Claude Code. Good. The first job is to install everything else you'll need.

Most of the steps below have Claude doing them for you. A few require you to click around in your browser or terminal. When that happens, Claude will tell you exactly what to do.

## 0.1 — The mental model (read this)

Before anything else, here's a thing that nobody tells beginners and it's confusing for weeks if you don't get it:

**Your app is just a folder of text files.**

That's it. There's no magic. When Claude "builds your app," it's writing text into files inside this folder. When you "run your app," your computer reads those files and turns them into something interactive. Every app you've ever used is, at its root, a tree of files like the one in this folder.

The files have extensions that tell you what they are:
- `.md` = markdown (notes, docs, this file you're reading)
- `.tsx` = React UI code (the visual stuff)
- `.ts` = TypeScript (logic and backend)
- `.json` = config and data
- `.css` = styling

You can open ANY of these in Zed and read them. They're just text. You won't be able to read most of them fluently — that's fine, that's the whole point of having Claude do the writing — but seeing them helps the abstraction collapse.

- [ ] **Open the file tree in Claude Code** and look at what's currently in your folder. You should see `CLAUDE.md` and `PROGRESS.md` (this file). That's literally the whole project right now.
- [ ] **Ask Claude: "show me what's in CLAUDE.md and explain it to me in plain English."** Just so you've seen one file open.

## 0.2 — Install the tools

Heads up — **you do not need to learn terminal commands. Claude runs them.** Most of the steps below happen when you ask Claude to do them. Your job is to type your Mac password if it asks for one, click through any browser windows that pop up, and confirm when Claude says something worked. That's it.

The list (ask Claude to do each one):

- [x] **Homebrew** (Mac's tool for installing developer software)
  - "Install Homebrew for me." Claude will print a command in your terminal. You'll need to type your Mac password when it asks.
- [x] **Node.js** (the engine that runs Next.js)
  - "Install Node using Homebrew." Claude does the rest.
- [x] **Git** (tracks code changes)
  - "Install Git." (Probably already installed — Claude will check first.)
- [x] **Zed** (a code editor — so you can open files and look at them yourself)
  - This one's manual: download from [zed.dev](https://zed.dev), open it once so Mac approves it.
- [x] **GitHub CLI (`gh`)** (lets Claude push your code to GitHub from the terminal)
  - "Install GitHub CLI."

That's the entire install list. Nothing to memorize. From here on, anytime you read a step that mentions a terminal command, just ask Claude to do it — that's the default mode.

## 0.3 — Set up your GitHub account

GitHub is where your code lives in the cloud. You need an account.

- [x] **Create a GitHub account** if you don't have one — go to [github.com/signup](https://github.com/signup).
- [x] **Authenticate the gh CLI** so Claude can push code on your behalf.
  - Ask Claude: "Walk me through `gh auth login`." It'll open a browser flow.

## 0.4 — Install Superpowers (Claude skills)

Superpowers is a set of skills that make Claude better at structured work — brainstorming, planning, debugging, etc. You'll use these a LOT.

- [x] **In Claude Code, run this command:**
  ```
  /plugin install superpowers@claude-plugins-official
  ```
  Wait for confirmation. Skills auto-load into every future session.
- [x] **Verify it worked:** ask Claude to "list my available skills." You should see things starting with `superpowers:`.

## 0.5 — Install Claude in Chrome

This lets Claude see your app in the browser when you're building. Without it, Claude is flying blind on visual stuff.

- [x] **Install the Chrome extension** — ask Claude: "How do I install Claude in Chrome MCP?" It'll guide you to the extension and configure the connection.
- [x] **Test it:** ask Claude to take a screenshot of any open tab in Chrome.

## 0.6 — Set up Vercel

Vercel is where your app will be hosted on the public internet. Free tier is fine for this project.

- [x] **Create a Vercel account** — [vercel.com/signup](https://vercel.com/signup). Sign up with your GitHub account so they're linked.
- [x] **Install the Vercel CLI** — ask Claude: "Install Vercel CLI."

## 0.7 — Watch Claude Code 101

Before you start building, watch this. It's the one piece of "homework" you have to do.

- [x] **Watch [Claude Code 101](https://anthropic.skilljar.com/claude-code-101)** on Anthropic Academy (~1–2h, free, no signup beyond Skilljar).
  - Focus on: starting sessions, the agentic loop, slash commands, CLAUDE.md, Plan Mode, skills.
  - You don't have to memorize it — just see the shape of how Claude Code works.

## 0.8 — End of Section 0

- [x] **Run `/handoff`** to capture where you are.
- [x] **Take a break.** That was a lot. Come back fresh for Section 1.

---

# Section 1 · Scaffold Your Project

Now you have the tools. Time to make the actual project — a Next.js app with shadcn/ui, in a GitHub repo, deployed to Vercel.

You'll do most of this in one session. Claude does the work; you watch and tick boxes.

## 1.1 — Initialize the project

- [x] **Ask Claude: "Scaffold a fresh Next.js app in this folder, but don't delete CLAUDE.md or PROGRESS.md."**
  - Claude will run `npx create-next-app@latest .` with sensible defaults (TypeScript, Tailwind, App Router).
  - You'll see a LOT of new files appear in the file tree. Look at them. That's your app skeleton now.
- [x] **Install shadcn/ui** — ask Claude: "Initialize shadcn/ui in this project."
  - This is the design system you'll use for every component. Day 1, no exceptions.
- [x] **Add the basic shadcn components** — ask Claude: "Install the shadcn Button, Card, and Badge components." (You'll add more as you need them.)
- [x] **Run the dev server** — ask Claude: "Start the dev server." Open the URL it gives you in Chrome. You should see the default Next.js page.

## 1.2 — Push to GitHub

- [x] **Create the GitHub repo** — ask Claude: "Create a GitHub repo for this project called `spotify-wrapped` and push the current code to it."
  - Claude will use `gh repo create` and `git push`.
- [x] **Turn on branch protection for `main`** — ask Claude: "Walk me through turning on branch protection for `main` on github.com." (This forces you to use PRs and never push directly. The discipline matters.)

## 1.3 — Link to Vercel and deploy

- [x] **Link the repo to Vercel** — ask Claude: "Walk me through linking this repo to a new Vercel project." You'll do some of this in your browser at vercel.com.
- [x] **Deploy** — once linked, Vercel auto-deploys on every push to main. Your first deploy happens automatically.
- [x] **Visit the live URL.** You should see the same default Next.js page, but now on the public internet. Take a moment to appreciate that.

## 1.4 — End of Section 1

- [x] **Run `/handoff`.**

---

# Section 2 · Spotify Developer Setup

Before you can pull Spotify data, you need to register your app with Spotify so they know who you are.

- [x] **Create a Spotify Developer account** at [developer.spotify.com](https://developer.spotify.com). Use the same account you listen to music with.
- [x] **Register your app** — ask Claude to walk you through it on the Spotify dashboard. You'll need:
  - App name: "Spotify Wrapped" (or whatever)
  - Redirect URI: this matters — you'll have one for local dev (`http://127.0.0.1:3000/api/auth/callback`) and one for production (`https://<your-vercel-url>/api/auth/callback`). Add both. *(Note: Spotify now requires `127.0.0.1` instead of `localhost` for loopback URIs.)*
- [x] **Save your Client ID and Client Secret somewhere safe.** Claude will store them as environment variables when you set up OAuth in PR 3.

## 2.1 — End of Section 2

- [ ] **Run `/handoff`.**

You're ready to build. The next thing you do is open a new session and ask Claude "what's next?" — and PR 1 begins.

---

# Phase 1 · Playground

The next two PRs are deliberately throwaway. You're going to build some flashy front-end stuff that has nothing to do with Spotify yet. The point is:

- Learn how shadcn components compose
- Learn the workflow loop (brainstorm → plan → execute → verify → PR → review)
- Get comfortable with Claude in Chrome
- Feel what "wow factor" looks like in the design system

After PR 2, you'll delete all of it. That's intentional.

## PR 1 · A wow-factor static landing page

**What you're building:** A polished, one-page marketing/landing page. Big typography, smooth animations, gradients, maybe a hero image. It can be about anything — your favorite band, a fake product, whatever. The data is fake or hardcoded. The point is that it looks *good*.

**The lesson:** Design primitives and the basic workflow loop. By the end of this you'll know what shadcn components feel like and how to ship a deploy.

### Steps (full detail — this is your first time)

- [x] **Create a feature branch** — ask Claude: "Make a branch called `pr-1-landing-page`."
- [x] **Brainstorm** — run `/superpowers:brainstorming` and talk through what you want the page to look like. What's the vibe? What's the "wow"? Don't write any code yet.
- [x] **Plan** — run `/superpowers:writing-plans` to capture the plan into a file (`docs/plans/pr-1.md` or similar). Read the plan. Push back if anything feels off.
- [x] **Execute** — ask Claude to build it according to the plan. Claude does the typing. You watch what files it's editing.
- [x] **Verify** — start the dev server, open the page in Chrome, ask Claude to screenshot it via Claude in Chrome and tell you what it sees. Run the **Explain-Show-Test loop**: does it match the plan? Does it look like what you brainstormed?
- [x] **Iterate** — if the page isn't right, describe what's off in plain English. Claude will adjust.
- [x] **Commit** — ask Claude: "Commit these changes with a clear message."
- [x] **Open a PR** — ask Claude: "Push the branch and open a PR to main."
- [x] **Self-review** — run `/code-review` on the PR. Read the findings. Ask Claude to explain anything that doesn't make sense. Decide what to fix and what to ignore.
- [x] **Merge** — once the review is clean, merge the PR on github.com.
- [x] **Check the deploy** — Vercel should auto-deploy. Visit the live URL. Confirm it shipped.
- [x] **Run `/handoff`** to end the session.

## PR 2 · A fake-data dashboard

**What you're building:** A multi-component dashboard layout. Cards showing fake "top tracks," fake "top artists," fake stats. Use shadcn `<Card>`, `<Badge>`, maybe a chart library. Hardcode the data — no real Spotify yet.

**The lesson:** Component composition, layout, and getting Claude in Chrome to verify visual work for you.

### Steps (compressed — you know the loop)

- [x] Branch → brainstorm → plan → execute (same shape as PR 1)
- [x] Make sure to use shadcn components throughout. No hand-rolled buttons or cards. If you need a primitive that isn't installed, run `npx shadcn@latest add <name>`.
- [x] Verify via Claude in Chrome (Explain-Show-Test loop)
- [x] PR → self-review → merge → check deploy
- [x] Run `/handoff`

---

# Reset → Phase 2

Time to throw away the playground. Don't worry — the muscle memory stays.

- [ ] **Start a fresh session.** Tell Claude: "We're done with the playground. Reset the app to a clean Next.js + shadcn skeleton — delete the landing page and the fake dashboard."
- [ ] Claude will guide you through removing the playground code and getting back to a clean state on a branch.
- [ ] **Open a PR for the reset, merge it.** Treat the reset itself as a PR.
- [ ] **Run `/handoff`.**

Now you're ready for the real build.

---

# Phase 2 · The Real Build

## PR 3 · OAuth handshake works

**What you're building:** The login flow. User clicks "Log in with Spotify," gets redirected to Spotify, approves, comes back, and sees "Logged in as `<their_username>`" on the page. No other features yet — just the handshake.

**The lesson:** How auth works at a conceptual level (you don't need to write the code, but you should know what's happening). Also: this is your first multi-session work. You'll likely run out of time in one sitting and have to pick up next session — which means you'll feel session-restart pain for the first time. That's the moment for the next step.

### Steps

- [ ] Branch → brainstorm OAuth conceptually with Claude (have it explain the flow in plain English first) → plan → execute
- [ ] Set up environment variables for your Spotify Client ID + Secret (Claude will handle the file, but you'll paste the values from Section 2)
- [ ] Implement the OAuth 2.0 PKCE flow (Claude does this — your job is to verify it works)
- [ ] Verify: click "Log in with Spotify," go through the real flow, see your username on screen
- [ ] PR → self-review → merge → deploy
- [ ] **Build your own `/handoff` skill** — by now you've felt what it's like to restart a session. Ask Claude: "Help me build my own `/handoff` skill using the `/superpowers:writing-skills` skill. It should write a session summary to `docs/handoffs/` that the next session can read." Use `/superpowers:writing-skills` to do it right.
- [ ] **Use your new skill** to end this session.

## PR 4 · First real data on screen

**What you're building:** Replace the hardcoded data in the dashboard with real data from Spotify. Start with user profile + top tracks for one time window (e.g., last 4 weeks).

**The lesson:** Hitting a real API, handling responses, loading states, error states.

### Steps

- [ ] Branch → brainstorm → plan → execute → verify → PR → review → merge → deploy
- [ ] Make sure the dashboard handles: loading (while data is fetching), success (data renders), and error (Spotify is down or the token expired)
- [ ] End with your new `/handoff` skill

## PR 5 · Time-window toggle

**What you're building:** A switcher for top tracks and top artists across three time windows — last 4 weeks, last 6 months, all time.

**The lesson:** Client-side state, URL params (so the selection persists across reload), list component reuse.

- [ ] Branch → brainstorm → plan → execute → verify → PR → review → merge → deploy → handoff

## PR 6 · Recently played + now playing

**What you're building:** A "what you've been listening to lately" section + a small "now playing" indicator at the top.

**The lesson:** Real-time feel (polling), more loading/empty states, working with chronological data.

- [ ] Branch → brainstorm → plan → execute → verify → PR → review → merge → deploy → handoff

## PR 7 · Genre breakdown

**What you're building:** A chart showing what genres you listen to most. Spotify gives you artists with genre arrays — you'll count them across your top artists and visualize.

**The lesson:** Data transformation (turning a list of artists into a count of genres), working with derived values.

- [ ] Branch → brainstorm → plan → execute → verify → PR → review → merge → deploy → handoff

## PR 8 · Listening time + KPI cards

**What you're building:** Big-number "headline" cards at the top of the dashboard — total tracks listened, estimated listening time, top genre, etc. Aggregations across the data you already have.

**The lesson:** Working with imperfect / estimated data and framing it honestly (don't claim precision you don't have).

- [ ] Branch → brainstorm → plan → execute → verify → PR → review → merge → deploy → handoff

## PR 9 · Polish pass

**What you're building:** Polish. Animations, loading skeletons, mobile responsiveness, dark mode, empty states, small details. No new features — just making what's there feel finished.

**The lesson:** Shipping polish is its own skill. Polish PRs feel slow and small but they're what makes the difference between "fine" and "good."

- [ ] Branch → brainstorm what "polished" means → plan → execute → verify → PR → review → merge → deploy → handoff

## PR 10 · Signature feature + production submission

**What you're building:** One thing that's HIS. Pick something that makes the app feel like yours and not just a tutorial output. Ideas: a shareable "wrap card" image you can post to social, time-of-day listening analysis, a mood graph, a "your year in music" page. Pick something that excites you.

Also: submit the Spotify app for "Extended Quota Mode" so other people (not just you) can log in. Until you do that, only accounts you've explicitly added on the Spotify dashboard can use the app.

**The lesson:** This is the moment the app stops being practice and starts being a thing. Make it real.

- [ ] Branch → brainstorm what the signature feature should be → plan → execute → verify → PR → review → merge → deploy
- [ ] Submit the app for extended quota mode on the Spotify dashboard
- [ ] Add anyone who wants to test as an approved user in the meantime
- [ ] Final `/handoff`

---

# After PR 10

You shipped a real, deployed app. People can log in with their Spotify and see their data. You built it without writing any code yourself.

More importantly: you've internalized a workflow that works for any project, not just this one. Brainstorm → plan → execute → verify → PR → review → handoff. That's the actual product of this whole thing.

What's next:
- Tell Luke. The next step is real PRs in his app, with him reviewing.
- Show the app to people. Get reactions. That's how you learn what's actually good.
- Notice what felt hard. The things that confused you the most are the things worth understanding more deeply. Now would be a good time to dig into them — with Claude as your guide, the same way you got here.
