# PR 3 — Spotify OAuth handshake (design)

**Date:** 2026-05-27
**Branch:** `pr-3-oauth`
**Status:** Design approved, ready for implementation plan

## Goal

The disabled "Log in with Spotify" button on `/` becomes a real button that kicks off a Spotify OAuth 2.0 Authorization Code + PKCE flow. After the user approves on Spotify, they're redirected back to `/` and the page renders "Logged in as `<their Spotify display name>`" plus a logout button. No other features — no top tracks, no listening data, just the handshake.

This is the **first PR of Phase 2** — the moment the app stops being a static playground and starts integrating with an external system.

## Why this design (one-paragraph summary)

We roll our own PKCE flow using Next.js Route Handlers rather than installing Auth.js / NextAuth. This is deliberate: the value of PR 3 is *seeing* what OAuth is, not *configuring* a library that hides it. Total code is ~150–200 lines across 4 files. Token refresh is deferred to PR 4 (which has a real reason to need it). Cookie encryption is deferred indefinitely (low-stakes for an app this size with httpOnly + sameSite=lax already in place).

## In scope

- Login flow: `/` → click button → Spotify consent → redirect back → "Logged in as `<name>`"
- Logout flow: click logout → cookie cleared → back to login state
- Three render states on `/`: not-logged-in, logged-in, session-expired
- All six scopes the future PRs (4–10) will need, requested upfront
- Honest 401 handling: if the access token has expired, show "Session expired" + a fresh login link
- Local dev (`http://127.0.0.1:3000`) and production (`https://spotify-wrapped-lemon.vercel.app`) both work
- Manual verification via Claude in Chrome MCP

## Out of scope (deferred)

- **Token refresh** → PR 4 (when API calls actually make it matter)
- **Cookie encryption / signing** → indefinite (revisit if app gets a wider audience)
- **Any Spotify data beyond `/v1/me`** → PR 4+
- **UI polish beyond the three states** → PR 9
- **Network / Spotify-down error states** → naive handling for now (errors will throw; that's acceptable for PR 3)
- **Automated tests of the OAuth flow** → manual verification only (mocking Spotify is high-cost, low-value for this PR)

## OAuth concept (for future-Will reading this back)

Three actors: **the user**, **the app** (Next.js running on Vercel + locally), **Spotify**.

The whole point of OAuth is the user never gives the app their Spotify password. Instead:

1. App sends user to Spotify with a request: "this user wants to grant me these scopes"
2. User logs into Spotify (already are), Spotify asks user to approve
3. Spotify redirects user back to app with a one-time `code`
4. App's server exchanges the `code` (plus a per-flow PKCE secret) for an `access_token`
5. App uses `access_token` to call Spotify APIs on the user's behalf

**PKCE** (Proof Key for Code Exchange): the app generates a random `code_verifier` at the start of the flow, sends a SHA-256 hash of it (`code_challenge`) to Spotify, then re-presents the original `code_verifier` at the token-exchange step. Spotify verifies they match. This prevents an attacker who intercepts the redirect from completing the flow — they'd have the `code` but not the `code_verifier`.

**`state` parameter**: random string the app generates, sends to Spotify, and verifies on the callback. Prevents CSRF attacks where a malicious site tries to trick a user's browser into hitting our callback URL with a forged code.

## Scopes requested

All six requested upfront so PRs 4–6 don't trigger re-consent for existing users:

| Scope | Used in | What it grants |
|---|---|---|
| `user-read-private` | PR 3 | Read user profile (display name) |
| `user-read-email` | PR 3 | Read user email (nice-to-have for "Logged in as" display) |
| `user-top-read` | PR 4, 5, 7 | Read top tracks + top artists |
| `user-read-recently-played` | PR 6 | Read recently played tracks |
| `user-read-currently-playing` | PR 6 | Read currently playing track |
| `user-read-playback-state` | PR 6 | Read playback context (device, shuffle state) |

## Architecture

### New files

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts       ← starts the OAuth dance (GET)
│   │       ├── callback/route.ts    ← receives Spotify redirect, exchanges code for tokens (GET)
│   │       └── logout/route.ts      ← clears the session cookie (POST)
│   └── page.tsx                     ← (edited) conditional render based on session
├── components/
│   └── auth/
│       ├── login-button.tsx         ← (new) Server Component wrapping <a> in shadcn Button
│       └── logout-button.tsx        ← (new) Server Component wrapping <form> with logout Button
└── lib/
    ├── spotify.ts                   ← (new) session reader + getMe() helper
    └── auth.ts                      ← (new) PKCE helpers (codeVerifier, codeChallenge), cookie names
```

### Modified files

- `src/app/page.tsx` — three render states (not-logged-in / logged-in / session-expired)

### New gitignored file

- `.env.local` (root) — `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`

## Concrete flow (mapped to our endpoints)

1. User at `127.0.0.1:3000`. Home page reads `spotify_session` cookie server-side. No cookie → renders "Log in with Spotify" as `<a href="/api/auth/login">` styled as a shadcn Button.
2. User clicks the link. Browser does a top-level `GET /api/auth/login`. The route handler:
   - generates `state` (random URL-safe string, ~32 bytes)
   - generates `code_verifier` (random URL-safe string, 43–128 chars per RFC 7636)
   - sets an `oauth_pkce` cookie containing `{ state, codeVerifier }` (httpOnly, 10-minute maxAge, sameSite=lax)
   - computes `code_challenge = base64url(sha256(code_verifier))`
   - 302-redirects to `https://accounts.spotify.com/authorize?` with params: `client_id`, `response_type=code`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`, `scope` (space-separated list of the six scopes)
3. Browser on `accounts.spotify.com`. Spotify shows the consent screen. User clicks Allow.
4. Spotify 302s to `GET /api/auth/callback?code=<code>&state=<state>`. The route handler:
   - reads the `oauth_pkce` cookie; rejects with 400 if missing
   - rejects with 400 if `state` from query ≠ `state` from cookie (CSRF check)
   - POSTs to `https://accounts.spotify.com/api/token` with body (form-encoded): `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `code_verifier`. No `Authorization` header, no `client_secret` in the body — PKCE-only token exchange (the proof that we initiated the flow is the `code_verifier`, not the secret).
   - parses the response: `{ access_token, refresh_token, expires_in, token_type, scope }`
   - sets `spotify_session` cookie: `JSON.stringify({ accessToken, refreshToken, expiresAt: Date.now() + expires_in * 1000 })`, httpOnly, secure (prod only), sameSite=lax, path=/, maxAge=30 days
   - deletes the `oauth_pkce` cookie
   - 302-redirects to `/`
5. User back at `/`. Home page reads `spotify_session`, parses JSON, calls `getMe(accessToken)`:
   - `GET https://api.spotify.com/v1/me` with `Authorization: Bearer <accessToken>`
   - 200 → render "Logged in as `<display_name>`" + logout button
   - 401 → render "Session expired" + login button
6. User clicks logout. Browser POSTs `/api/auth/logout` via a `<form action="/api/auth/logout" method="POST">`. Handler deletes `spotify_session`, 302s to `/`. User sees the login button again.

## Session cookie strategy

### Cookie: `spotify_session`

**Value:** JSON-encoded object

```json
{
  "accessToken": "BQ...",
  "refreshToken": "AQ...",
  "expiresAt": 1748390123000
}
```

**Attributes:**
- `httpOnly: true`
- `secure: true` in production, `false` in dev (so `http://127.0.0.1` works)
- `sameSite: 'lax'` (sent on top-level navigation including Spotify's redirect)
- `path: '/'`
- `maxAge: 60 * 60 * 24 * 30` (30 days)

**Plaintext, not encrypted.** Honest tradeoff: anyone with access to the user's browser cookie jar can read the tokens. That's a low-stakes attack vector (the same access enables opening Spotify directly). httpOnly + sameSite=lax defend against the realistic web attacks (XSS exfiltration, CSRF). If we ever expand audience meaningfully, switch to a signed/encrypted cookie using a server-only secret.

### Cookie: `oauth_pkce` (short-lived)

**Value:** JSON-encoded `{ state, codeVerifier }`

**Attributes:** same as `spotify_session` but `maxAge: 60 * 10` (10 minutes) — long enough for a user to click through Spotify's consent, short enough that abandoned flows clean themselves up.

**Deleted after a successful callback or rejected callback.**

### Token refresh — explicitly deferred to PR 4

The home page is a Server Component. In Next.js App Router, `cookies().set()` is not allowed in Server Components — only in Route Handlers, Server Actions, and Middleware. So a Server Component can't refresh a token mid-render.

For PR 3, the home page just calls Spotify with whatever access token it has and handles the 401 gracefully ("Session expired. Log in again."). For Will's PR 3 testing window (minutes from login to screenshot), the access token will always be fresh.

PR 4 will introduce middleware that runs before the page renders, checks `expiresAt`, refreshes the token if needed via the refresh-token grant, and writes the updated cookie. The refresh-token grant POSTs to `https://accounts.spotify.com/api/token` with `grant_type=refresh_token` + `refresh_token` + `client_id` (PKCE-style, no secret).

## UI render states

All three states use the existing centered Card layout. No new shadcn primitives needed.

### State 1 — not logged in (no cookie)

- Card heading: "Spotify Wrapped"
- CardDescription: "Your listening, your year."
- Action: `<Button asChild className="w-full"><a href="/api/auth/login">Log in with Spotify</a></Button>`

### State 2 — logged in (cookie + 200 from /v1/me)

- Card heading: "Spotify Wrapped"
- CardDescription: "Logged in as **`<display_name>`**" (display_name in bold via `<strong>` or `<span className="font-semibold">`)
- Action: `<form action="/api/auth/logout" method="POST"><Button type="submit" variant="outline" className="w-full">Log out</Button></form>`

### State 3 — session expired (cookie + 401 from /v1/me)

- Card heading: "Spotify Wrapped"
- CardDescription: "Your session expired."
- Action: same as State 1 — a fresh `<a href="/api/auth/login">` styled as a shadcn Button.

**No Client Components needed.** The login is a plain `<a>` (top-level navigation), the logout is a plain `<form method="POST">` (top-level navigation after submit). Zero client JS for PR 3.

## Environment configuration

### `.env.local` (gitignored, root of repo)

```
SPOTIFY_CLIENT_ID=eca7a4a0621c4b0e8107aa042f03b7d5
SPOTIFY_CLIENT_SECRET=<paste from password manager>
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
```

**Note on `SPOTIFY_CLIENT_SECRET`:** stored in `.env.local` but **not used in PR 3** — PKCE doesn't need it for the token exchange. We capture the value now because (a) it's already in Will's password manager from Section 2 setup, and (b) some future Spotify flows we might use later (e.g., Client Credentials for app-only API calls) would require it. Treat it as forward-compatible config, not active dependency.

### Vercel dashboard (Production environment)

```
SPOTIFY_CLIENT_ID=eca7a4a0621c4b0e8107aa042f03b7d5
SPOTIFY_CLIENT_SECRET=<same value>
SPOTIFY_REDIRECT_URI=https://spotify-wrapped-lemon.vercel.app/api/auth/callback
```

### Spotify developer dashboard

Both redirect URIs must be registered on the Spotify app's settings page at https://developer.spotify.com/dashboard:

- `http://127.0.0.1:3000/api/auth/callback`
- `https://spotify-wrapped-lemon.vercel.app/api/auth/callback`

Per session-5 handoff notes, both should already be registered. The plan should include a verification step where Will opens the Spotify dashboard and confirms.

### The `127.0.0.1` rule (carried forward from session 5 + 6 handoffs)

Spotify rejects `localhost` in redirect URIs — they require the literal IP `127.0.0.1`. This means:

- The registered redirect URI uses `127.0.0.1`
- Will must visit `http://127.0.0.1:3000` (NOT `http://localhost:3000`) when testing locally
- If he visits `localhost:3000` and clicks login, Spotify will respond with `INVALID_CLIENT: Invalid redirect URI` because the request originated from a URL Spotify doesn't recognize

The plan should call this out at the top of the verification steps, and the dev-server "open browser at" message should explicitly say `127.0.0.1:3000`.

## Verification (Explain-Show-Test loop)

Manual verification via Claude in Chrome MCP. Will runs the dev server; Claude drives the browser.

1. **Setup check** — `.env.local` exists with all three vars, dev server restarted after creating it (env changes require restart)
2. **State 1 visible** — visit `http://127.0.0.1:3000`, screenshot shows the login button enabled (not the previous `disabled` state)
3. **Spotify consent screen** — click login, browser lands on `accounts.spotify.com`, consent screen shows six scopes listed
4. **State 2 visible** — click Allow, browser bounces through `/api/auth/callback`, lands back on `/`, page shows "Logged in as `<Will's display name>`" + logout button
5. **Cookie inspection** — DevTools → Application → Cookies → `spotify_session` exists, httpOnly is true, secure is false (we're on http locally), sameSite is Lax, content is a JSON blob with accessToken / refreshToken / expiresAt
6. **Logout works** — click logout, page returns to State 1
7. **State 3 reachable** — in DevTools → Application → Cookies, edit the `spotify_session` value: corrupt the `accessToken` (e.g., change a few characters) so Spotify will reject it as invalid, then reload `/`. Page should show "Session expired" + login button. (Note: changing `expiresAt` alone won't trigger State 3 — the home page doesn't check that field in PR 3; it relies on Spotify's 401 response. PR 4 changes this when middleware-based refresh lands.)
8. **CSRF check (edge case)** — open an incognito tab, hit `/api/auth/callback?code=fake&state=fake` directly — should respond with 400, not crash
9. **Production deploy** — once merged, the Vercel auto-deploy succeeds and the live URL handshake works end-to-end with the production redirect URI

## Implementation notes for the plan

The plan should sequence work approximately as:

1. **PKCE + cookie helpers** in `lib/auth.ts` — pure functions, easy to verify mentally
2. **`/api/auth/login` route** — kick off the flow, easy to test (just check the redirect URL it generates)
3. **`/api/auth/callback` route** — the meaty one, token exchange happens here
4. **`/api/auth/logout` route** — trivial, ~5 lines
5. **`lib/spotify.ts` with `getMe()`** — read cookie, fetch `/v1/me`
6. **`page.tsx` three states + button components** — UI work
7. **Verify locally**, fix anything off
8. **Configure Vercel env vars** in the dashboard, push, verify production

Each step is independently verifiable. Step 6 is where Claude in Chrome screenshots become useful.

## Open follow-ups (not blocking PR 3)

These are flagged in session 6 handoff and remain deferred:

- `--font-sans` CSS recursion (separate spawn-task chip exists in Will's UI)
- `.claude/settings.json` allowlist for fewer permission prompts
- Cookie encryption/signing (revisit if audience expands)

## Risks / things that could go sideways

- **Spotify dashboard redirect URI mismatch** — if either redirect URI isn't registered, the flow will fail mid-dance with an unhelpful error message from Spotify. Mitigation: explicit verification step in the plan to confirm both URIs are listed in the dashboard *before* trying to log in.
- **`.env.local` not picked up** — env changes require a dev server restart. Mitigation: plan explicitly includes a restart after `.env.local` is written.
- **Cookie not surviving the Spotify redirect** — if we accidentally set `sameSite=strict`, the cookie won't be sent on the redirect back from Spotify. Mitigation: explicit `sameSite=lax`, called out in the plan.
- **Production redirect URI typo** — if the Vercel env var has a typo, production breaks even though dev works. Mitigation: post-deploy verification step.
