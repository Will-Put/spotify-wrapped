# PR 4 — First Real Spotify Data on Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The logged-in home page renders the user's top 10 Spotify tracks (last 4 weeks) with album thumbnails, and a `proxy` (Next.js 16's renamed middleware) silently refreshes the access token before it expires so the session survives past Spotify's 1-hour token lifetime.

**Architecture:** Extend the existing home page (`/`) — no new route. A `src/proxy.ts` file intercepts requests to `/`, checks the session cookie's `expiresAt`, and refreshes via Spotify's token endpoint when close to expiry. The home page Server Component fetches profile + top tracks in parallel and renders a new `<TopTracks>` Server Component. Strict error policy: any non-401 API failure → existing `spotify-down` state.

**Tech Stack:** Next.js 16.2.6 (App Router, Turbopack, React 19.2), TypeScript, shadcn/ui, Tailwind. Spotify Web API. No new dependencies.

---

## ⚠️ Read this before Task 1 — what changed from the spec

The approved spec (`docs/superpowers/specs/2026-05-28-pr-4-first-real-data-design.md`) was written assuming Next.js's older `middleware` convention. **Next.js 16 renamed `middleware` → `proxy`.** Confirmed in the installed docs:

- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` (lines 625–638)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

**Concrete differences from the spec, all reconciled in this plan:**

| Spec said | Actual Next.js 16 | This plan does |
|---|---|---|
| File `src/middleware.ts` | `middleware` deprecated; renamed to `proxy` | Create `src/proxy.ts` |
| `export async function middleware()` | Function renamed to `proxy` | `export async function proxy()` |
| Runtime: Edge (default) | Proxy runs on **Node.js runtime**; `runtime` config throws if set | Don't set `runtime`. Node.js is automatic. |
| Don't import `@/lib/auth` (Edge can't use `node:crypto`) | Node runtime → `node:crypto` is fine | Import `COOKIE_NAMES` + `SessionCookieValue` from `@/lib/auth` (DRY, single source of truth) |

Everything else in the spec (the refresh logic flow, the three failure branches, cookie attributes, the page integration, the `<TopTracks>` component) carries over unchanged.

## Testing approach (read before starting)

This project uses **manual verification, not automated tests** — the same pattern as PR 3, and the spec explicitly defers automated tests (mocking Spotify is high-cost for the value). The user (Will) cannot read code, so the real test is the Explain-Show-Test loop in a browser.

Therefore, instead of TDD red/green steps, each code task's "gate" is:
- `npx tsc --noEmit` — type check passes (catches the most likely class of error: shape mismatches)
- `npm run lint` — lint passes

The end-to-end behavioral verification is **Task 5** (Claude in Chrome, driving Will's real Spotify account). This is a deliberate, user-instruction-aligned deviation from the writing-plans skill's TDD default — not an omission.

---

## Task 0: Confirm the branch (do NOT skip)

Session 8 accidentally committed to `main`. The very first thing: confirm we're on the feature branch.

- [ ] **Step 1: Verify current branch**

Run: `git branch --show-current`
Expected output: `pr-4-real-data`

If it says anything else (especially `main`), stop and run `git checkout pr-4-real-data` before any file changes.

- [ ] **Step 2: Verify the spec commit is present and tree is otherwise clean**

Run: `git log --oneline -1 && git status --short`
Expected: HEAD is `194d76f PR 4 spec...`. Status shows only `PROGRESS.md` modified + untracked handoff docs + the screenshot. No other modified source files.

---

## Task 1: Extend `src/lib/spotify.ts` with the top-tracks helper

**Files:**
- Modify: `src/lib/spotify.ts`

This adds the `SpotifyTrack` type, a `getTopTracks()` helper mirroring the existing `getMe()`, and renames `GetMeFailureReason` → `SpotifyApiFailureReason` (it's now shared between two helpers).

- [ ] **Step 1: Rename `GetMeFailureReason` → `SpotifyApiFailureReason`**

In `src/lib/spotify.ts`, change the type declaration (currently line 42):

```typescript
// BEFORE
export type GetMeFailureReason = "http" | "network" | "parse";

// AFTER
export type SpotifyApiFailureReason = "http" | "network" | "parse";
```

And update the one reference inside `GetMeResult` (currently line 44-46):

```typescript
export type GetMeResult =
  | { ok: true; profile: SpotifyProfile }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };
```

- [ ] **Step 2: Add the `SpotifyTrack` and `GetTopTracksResult` types**

Add these after the `GetMeResult` type (so all the shared types live together):

```typescript
export type SpotifyTrack = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
};

export type GetTopTracksResult =
  | { ok: true; tracks: SpotifyTrack[] }
  | { ok: false; status: number; reason: SpotifyApiFailureReason };
```

- [ ] **Step 3: Add the `getTopTracks()` helper**

Add at the end of the file. It mirrors `getMe()`'s structure exactly — same try/catch shape, same discriminated-union return — with the URL and parsed body swapped.

```typescript
type TopTracksOptions = {
  limit?: number;
  timeRange?: "short_term" | "medium_term" | "long_term";
};

/**
 * Call Spotify's `/v1/me/top/tracks` with the given access token.
 *
 * Defaults to the last-4-weeks window (`short_term`) and 10 tracks.
 * PR 5 will pass `timeRange` to switch windows. Same discriminated-union
 * return shape as `getMe` so callers handle failures identically.
 */
export async function getTopTracks(
  accessToken: string,
  options: TopTracksOptions = {},
): Promise<GetTopTracksResult> {
  const { limit = 10, timeRange = "short_term" } = options;
  const url = `${SPOTIFY_API}/me/top/tracks?time_range=${timeRange}&limit=${limit}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, reason: "network" };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, reason: "http" };
  }

  try {
    const data = (await response.json()) as { items: SpotifyTrack[] };
    return { ok: true, tracks: data.items };
  } catch {
    return { ok: false, status: response.status, reason: "parse" };
  }
}
```

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (no output, exit 0). If `GetMeFailureReason` is referenced anywhere else it will error here — grep `git grep GetMeFailureReason` should return nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spotify.ts
git commit -m "feat: add getTopTracks helper and shared SpotifyApiFailureReason type"
```

---

## Task 2: Create the token-refresh proxy

**Files:**
- Create: `src/proxy.ts`

This is the new concept. The proxy runs before the home page renders, refreshes the access token if it's near expiry, and writes the fresh cookie on the response. **It's `proxy.ts`, NOT `middleware.ts`** (Next.js 16 — see the warning section above).

- [ ] **Step 1: Create `src/proxy.ts`**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAMES, type SessionCookieValue } from "@/lib/auth";

// Spotify's token endpoint — same URL the OAuth callback uses. Refresh
// uses grant_type=refresh_token (PKCE-style: client_id, no client_secret).
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
// Refresh this many ms before the access token actually expires, so a
// request that arrives right at the boundary still gets a fresh token.
const REFRESH_BUFFER_MS = 60_000;

/**
 * Token-refresh proxy (Next.js 16's renamed middleware). Runs on the
 * Node.js runtime for every request matching `config.matcher`.
 *
 * Every branch returns `NextResponse.next()` (the `response` variable) so
 * the request ALWAYS continues — the proxy never blocks the user. The
 * cookie is only deleted on a definitive "refresh token is dead" signal
 * (400/401 from Spotify, or a malformed cookie). Transient failures keep
 * the existing cookie so a brief Spotify hiccup doesn't log anyone out.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const cookie = request.cookies.get(COOKIE_NAMES.session);
  if (!cookie) return response;

  let session: SessionCookieValue;
  try {
    session = JSON.parse(cookie.value);
    if (
      typeof session.refreshToken !== "string" ||
      typeof session.expiresAt !== "number"
    ) {
      response.cookies.delete(COOKIE_NAMES.session);
      return response;
    }
  } catch {
    response.cookies.delete(COOKIE_NAMES.session);
    return response;
  }

  // Fast path: token still has more than REFRESH_BUFFER_MS of life left.
  if (session.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return response;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return response;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
        client_id: clientId,
      }),
      cache: "no-store",
    });
  } catch {
    // Network error reaching Spotify — keep the old cookie, let the page try.
    return response;
  }

  // Definitive "refresh token is dead" — delete cookie, page goes anonymous.
  if (tokenResponse.status === 400 || tokenResponse.status === 401) {
    response.cookies.delete(COOKIE_NAMES.session);
    return response;
  }
  // Any other non-2xx (5xx, rate limit) — transient, keep the old cookie.
  if (!tokenResponse.ok) return response;

  let tokens: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  try {
    tokens = await tokenResponse.json();
  } catch {
    return response;
  }

  if (
    typeof tokens.access_token !== "string" ||
    typeof tokens.expires_in !== "number"
  ) {
    return response;
  }

  const newSession: SessionCookieValue = {
    accessToken: tokens.access_token,
    // Spotify sometimes rotates the refresh token, sometimes doesn't.
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  // Same cookie attributes as the OAuth callback (src/app/api/auth/callback/route.ts).
  response.cookies.set(COOKIE_NAMES.session, JSON.stringify(newSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

// Only run on the home page for PR 4. PR 5+ will widen this matcher as
// more routes need fresh auth. Do NOT add a `runtime` key — proxy is
// Node.js-only in Next 16 and setting `runtime` throws at build time.
export const config = { matcher: ["/"] };
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS. `NextRequest`/`NextResponse` come from `next/server`; `COOKIE_NAMES`/`SessionCookieValue` from `@/lib/auth`.

- [ ] **Step 3: Verify the dev server boots and recognizes the proxy**

Run: `npm run dev` (background it, or run briefly). Watch startup output.
Expected: Server starts on `http://127.0.0.1:3000` with no errors about `runtime` or proxy config. Next 16 should NOT print a deprecation warning (because we used `proxy.ts`, not `middleware.ts`). Stop the server after confirming.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: add proxy for silent Spotify token refresh"
```

---

## Task 3: Create the `<TopTracks>` component

**Files:**
- Create: `src/components/top-tracks.tsx`

A Server Component that renders the numbered list. Plain `<img>` (not Next.js `<Image>`) to avoid `next.config.ts` remote-pattern config — deferred to PR 9 polish.

- [ ] **Step 1: Create `src/components/top-tracks.tsx`**

```tsx
import type { SpotifyTrack } from "@/lib/spotify";

export function TopTracks({ tracks }: { tracks: SpotifyTrack[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Your top tracks (last 4 weeks)
      </h2>
      {tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No top tracks yet. Listen to some music on Spotify and come back in a
          few days.
        </p>
      ) : (
        <ol className="space-y-2">
          {tracks.map((track, i) => {
            // Spotify usually returns 3 sizes (640/300/64). Prefer the
            // smallest for a thumbnail; fall back up the chain if absent.
            const thumbnail =
              track.album.images[2] ??
              track.album.images[1] ??
              track.album.images[0];
            return (
              <li key={track.id} className="flex items-center gap-3">
                <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                {thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail.url}
                    alt={track.album.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
```

Note the `eslint-disable-next-line @next/next/no-img-element` comment — Next's lint rule nudges toward `<Image>`, but we're deliberately using `<img>` for PR 4 (documented in the spec). The disable comment keeps `npm run lint` clean without suppressing the rule project-wide.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/top-tracks.tsx
git commit -m "feat: add TopTracks list component"
```

---

## Task 4: Wire top tracks + the new state into the home page

**Files:**
- Modify: `src/app/page.tsx`

Extend `ViewState` so `logged-in` carries `tracks`, fetch profile + tracks in parallel, render `<TopTracks>`.

- [ ] **Step 1: Update the imports**

Change the import block at the top (currently lines 1-9) to add `getTopTracks`, `SpotifyTrack`, and `<TopTracks>`:

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { TopTracks } from "@/components/top-tracks";
import {
  getMe,
  getSession,
  getTopTracks,
  type SpotifyTrack,
} from "@/lib/spotify";
```

- [ ] **Step 2: Extend the `ViewState` type**

```tsx
type ViewState =
  | { kind: "anonymous" }
  | { kind: "logged-in"; displayName: string; tracks: SpotifyTrack[] }
  | { kind: "expired" }
  | { kind: "spotify-down" };
```

- [ ] **Step 3: Replace `resolveViewState` with the parallel-fetch version**

```tsx
async function resolveViewState(): Promise<ViewState> {
  const session = await getSession();
  if (!session) return { kind: "anonymous" };

  // Fetch profile + top tracks in parallel — both need the same token.
  const [meResult, tracksResult] = await Promise.all([
    getMe(session.accessToken),
    getTopTracks(session.accessToken, { limit: 10, timeRange: "short_term" }),
  ]);

  // Strict policy: a definitive 401 means re-login; anything else is
  // transient and routes to spotify-down. First failure wins.
  if (!meResult.ok) {
    if (meResult.reason === "http" && meResult.status === 401) {
      return { kind: "expired" };
    }
    return { kind: "spotify-down" };
  }
  if (!tracksResult.ok) {
    if (tracksResult.reason === "http" && tracksResult.status === 401) {
      return { kind: "expired" };
    }
    return { kind: "spotify-down" };
  }

  return {
    kind: "logged-in",
    // display_name can be null (rare). Fall back to the user's Spotify ID.
    displayName: meResult.profile.display_name ?? meResult.profile.id,
    tracks: tracksResult.tracks,
  };
}
```

- [ ] **Step 4: Render `<TopTracks>` in the logged-in `CardContent`**

Replace the `<CardContent>` block (currently lines 65-67) with:

```tsx
        <CardContent className="space-y-4">
          {view.kind === "logged-in" && <TopTracks tracks={view.tracks} />}
          {view.kind === "logged-in" ? <LogoutButton /> : <LoginButton />}
        </CardContent>
```

The `CardHeader` block (the four `CardDescription` branches) stays exactly as-is — the logged-in branch still shows "Logged in as <displayName>".

- [ ] **Step 5: Type check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: All PASS. The build is the real integration gate — it compiles the proxy, the page, and the component together. If the build fails, read the error before proceeding; the most likely culprit is the `127.0.0.1` rule or a type mismatch in the discriminated union.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: render real top tracks on the logged-in home page"
```

---

## Task 5: End-to-end verification (Claude in Chrome + Will)

**No files.** This is the Explain-Show-Test loop from CLAUDE.md, driving Will's real Spotify account. Claude drives Chrome; Will watches and reacts. Run `npm run dev` first.

- [ ] **Step 1: Fresh login → real data appears**

Visit `http://127.0.0.1:3000`. If logged in already, this should already show data. If anonymous, click "Log in with Spotify," complete consent. Screenshot the result.
Expected: Card with "Logged in as <Will's name>", an "Your top tracks (last 4 weeks)" heading, and 10 rows — each with rank (1–10), a square album thumbnail, track name, and artist name(s). Ask Will: do these tracks match what you've actually been listening to?

- [ ] **Step 2: Thumbnails load (no broken images)**

Inspect the screenshot. Expected: all 10 album covers render — no broken-image icons. If any are broken, check the `thumbnail.url` fallback chain.

- [ ] **Step 3: Token refresh on demand**

In Chrome DevTools → Application → Cookies → `http://127.0.0.1:3000`, edit `spotify_session`: change the `expiresAt` value inside the JSON to `1` (forces "expired"). Reload `/`.
Expected: page still shows logged-in data (the proxy refreshed before render). Re-inspect the cookie — `accessToken` value should differ from before, `expiresAt` should be ~1 hour in the future. This proves the proxy works.
*(If editing the cookie JSON in DevTools is fiddly for Will, Claude can do it via the Chrome MCP, or fall back to explaining the mechanism and trusting the build.)*

- [ ] **Step 4: Refresh fails gracefully**

Open `https://www.spotify.com/account/apps/` → revoke the "Spotify Wrapped" app. Reload `/` locally.
Expected: the proxy tries to refresh, Spotify returns 400 `invalid_grant`, the proxy deletes the cookie, and the page renders the anonymous state (login button). This proves the "dead refresh token" path. Will will need to re-login afterward (and re-consent, since he revoked).

- [ ] **Step 5: spotify-down state (optional — skip if fiddly)**

DevTools → Network → block `api.spotify.com`. Reload `/`.
Expected: both API calls fail at the network layer → `spotify-down` state ("Spotify is having trouble right now"). This path is functionally identical to PR 3's already-verified `spotify-down`, so it's acceptable to skip if the DevTools dance is annoying.

- [ ] **Step 6: Compare against the plan/spec**

Confirm with Will: does what's on screen match the spec's "in scope" list? 10 tracks, short_term, thumbnails, profile name unchanged. If anything's off, iterate before opening the PR.

---

## Task 6: PR → self-review → merge → production verify

- [ ] **Step 1: Push the branch**

```bash
git push -u origin pr-4-real-data
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "PR 4 — First real Spotify data on screen" --body "$(cat <<'EOF'
## Summary
- Render the user's top 10 tracks (last 4 weeks) on the logged-in home page, with album thumbnails
- Add `src/proxy.ts` (Next.js 16's renamed middleware) for silent access-token refresh — session survives past Spotify's 1-hour token lifetime
- Add `getTopTracks()` helper + `SpotifyTrack` type; rename `GetMeFailureReason` → shared `SpotifyApiFailureReason`

## Notes
- Used `proxy.ts` not `middleware.ts` — Next.js 16 renamed the convention and `proxy` runs on the Node.js runtime (Edge not supported).

## Test plan
- [x] Fresh login renders 10 real tracks with thumbnails
- [x] Token refresh verified by forcing cookie expiry (accessToken rotates, expiresAt advances)
- [x] Revoked app → proxy deletes cookie → anonymous state
- [x] tsc + lint + build pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Run `/code-review` on the PR**

Invoke `/code-review`. Triage findings with Will (use `/superpowers:receiving-code-review` if any feedback is unclear or technically questionable). Fix what matters, push fixes as new commits, defer the rest as spawn chips.

- [ ] **Step 4: Merge**

Once review is clean: `gh pr merge <PR#> --squash --delete-branch`, then `git checkout main && git pull`.

- [ ] **Step 5: Production verify**

Vercel auto-deploys `main` to `https://spotify-wrapped-lemon.vercel.app`. After the deploy finishes, repeat verification steps 1–3 against the canonical URL (NOT a preview URL — preview URLs are behind Vercel SSO and OAuth can't complete against them; see session-8 handoff).

---

## Task 7: Wrap-up — commit docs, clean up, tick boxes, handoff

- [ ] **Step 1: Tick PR 4 boxes in `PROGRESS.md`**

Mark the three PR 4 checkboxes (lines ~283-285) as `- [x]`.

- [ ] **Step 2: Delete stale local branches** (from session-8 handoff)

```bash
git branch -D pr-2-fake-dashboard pr-2-wrapup
```

- [ ] **Step 3: Commit the handoff docs + PROGRESS.md**

The untracked `docs/handoffs/session-6.md`, `session-7.md`, `session-8.md` ride along now (per the established convention). Decide with Will whether to commit the root screenshot or gitignore it.

- [ ] **Step 4: Run `/handoff`**

First real use of Will's own `/handoff` skill as a registered slash command. Writes `docs/handoffs/session-9.md`.

---

## Self-review notes (plan author)

- **Spec coverage:** top tracks ✓ (Task 1, 3, 4), token refresh ✓ (Task 2), strict error policy ✓ (Task 4 resolveViewState), empty state ✓ (Task 3), profile unchanged ✓ (Task 4 keeps CardHeader), manual verification ✓ (Task 5). Out-of-scope items (toggle, top artists, genres, KPIs) correctly absent.
- **Spec deviations, all intentional and documented:** `middleware.ts`→`proxy.ts`, Edge→Node runtime, inline-constants→import-from-auth. All driven by Next.js 16 docs, all flagged in the warning section.
- **Type consistency:** `SpotifyApiFailureReason` defined in Task 1, used in `GetMeResult` + `GetTopTracksResult`. `SpotifyTrack` defined Task 1, consumed Task 3 + Task 4. `SessionCookieValue` imported in proxy matches `lib/auth.ts`. `getTopTracks` signature `(accessToken, options)` matches the call site in Task 4.
- **No placeholders:** every code step shows complete code; every command shows expected output.
