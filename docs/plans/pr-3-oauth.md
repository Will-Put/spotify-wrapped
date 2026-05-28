# PR 3 — Spotify OAuth Handshake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disabled "Log in with Spotify" button on `/` with a working Authorization Code + PKCE OAuth flow that lands the user back on `/` showing "Logged in as `<display_name>`."

**Architecture:** Roll our own PKCE flow using Next.js 16 Route Handlers (no `next-auth`). Three new route handlers under `app/api/auth/`, two pure-helper libs under `src/lib/`, two tiny Server Components under `src/components/auth/`, and a rewrite of `page.tsx` to render three states (anonymous / logged-in / session-expired). One long-lived `spotify_session` cookie holds the tokens; one short-lived `oauth_pkce` cookie holds the per-flow state + verifier.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · `@base-ui/react/button` (shadcn-style wrapper at `src/components/ui/button.tsx`) · Node `crypto` module · Spotify Web API.

**Spec:** [docs/superpowers/specs/2026-05-27-pr-3-spotify-oauth-design.md](../superpowers/specs/2026-05-27-pr-3-spotify-oauth-design.md) (committed as `b8c2177`).

---

## Notes for the implementer

### Why no tests in this plan

The spec deliberately defers automated tests. Mocking Spotify's OAuth provider is high-cost (full HTTP mock with PKCE-aware challenge verification) and low-value for a single handshake feature. Verification is **manual via Claude in Chrome MCP** at Task 9. PR 4 (real data fetching) is where we'll introduce API-mock patterns. For now: read the code carefully, follow the verification checklist exactly.

### The `127.0.0.1` rule — pin this before any verification

**Spotify rejects `localhost` in redirect URIs. They require the literal IP `127.0.0.1`.**

When the dev server starts and prints `http://localhost:3000`, **do not visit that URL.** Visit `http://127.0.0.1:3000` instead. Otherwise:

- The cookie set on `localhost` is on a different origin than the one Spotify redirects you back to (`127.0.0.1`), so the PKCE cookie won't be readable
- Spotify will respond with `INVALID_CLIENT: Invalid redirect URI` because the request originated from a URL not in the redirect-URI allow-list

Every verification step in this plan that says "visit the home page" or "open the login URL" means **`127.0.0.1:3000`**, not `localhost:3000`.

### Base UI vs shadcn — the Button is custom

`src/components/ui/button.tsx` wraps `@base-ui/react/button`, not Radix. **There is no `asChild` prop.** To render a Button as an `<a>` element, use Base UI's `render` prop:

```tsx
<Button render={<a href="..." />} nativeButton={false} className="...">
  Label
</Button>
```

`nativeButton={false}` tells Base UI the rendered element isn't a `<button>` (it's an `<a>`), which keeps the accessibility attributes correct.

### Frequent commits

Each task ends with a `git commit`. Don't batch commits across tasks — the discipline matters even on small PRs and a clean history helps `/code-review` at Task 12.

---

## File map

### New files

| Path | Responsibility |
|---|---|
| `.env.local` | Local-only env vars (gitignored). NOT committed. Created by Will manually in Task 1. |
| `src/lib/auth.ts` | PKCE helpers (`generateRandomString`, `generateCodeChallenge`), cookie name constants, scope list, `buildAuthorizeUrl`, exported types. Pure functions only. |
| `src/lib/spotify.ts` | `getSession()` reads + parses the session cookie; `getMe(accessToken)` calls Spotify `/v1/me`. |
| `src/app/api/auth/login/route.ts` | `GET` — generates PKCE values, sets `oauth_pkce` cookie, 302s to Spotify's authorize URL. |
| `src/app/api/auth/callback/route.ts` | `GET` — validates state, exchanges code for tokens, sets `spotify_session` cookie, deletes `oauth_pkce` cookie, 302s to `/`. |
| `src/app/api/auth/logout/route.ts` | `POST` — deletes `spotify_session` cookie, 303s to `/`. |
| `src/components/auth/login-button.tsx` | Server Component wrapping shadcn Button → `<a href="/api/auth/login">`. |
| `src/components/auth/logout-button.tsx` | Server Component wrapping shadcn Button inside `<form action="/api/auth/logout" method="POST">`. |

### Modified files

| Path | Change |
|---|---|
| `src/app/page.tsx` | Becomes `async`. Reads session, calls `getMe()`, renders one of three states. Replaces the disabled Button at `page.tsx:22-24`. |

---

## Task 1 — Env vars + Spotify dashboard verification

**Files:**
- Create (by Will, manually): `.env.local` at repo root

**Notes:** `SPOTIFY_CLIENT_SECRET` is captured but unused in PR 3 (PKCE doesn't need it). Stored for future flows.

- [ ] **Step 1: Verify both redirect URIs are registered in the Spotify dashboard**

Open https://developer.spotify.com/dashboard → "Spotify Wrapped" → Settings. Under "Redirect URIs" both of these must be present, exactly as written:

```
http://127.0.0.1:3000/api/auth/callback
https://spotify-wrapped-lemon.vercel.app/api/auth/callback
```

Per session-5 / session-6 handoffs, both should already be there. If either is missing, click "Edit," add it, click Save. Spotify is strict about exact match — no trailing slashes, no `localhost`, no `http` vs `https` confusion.

- [ ] **Step 2: Will creates `.env.local` at repo root** (file is gitignored by `.gitignore` line 28)

Will opens Zed, creates a new file at the project root named `.env.local`, and pastes:

```
SPOTIFY_CLIENT_ID=eca7a4a0621c4b0e8107aa042f03b7d5
SPOTIFY_CLIENT_SECRET=<paste from your password manager>
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
```

The `SPOTIFY_CLIENT_SECRET` value comes from Will's password manager (the value he saved during Section 2 setup). The Client ID is public and visible on the Spotify dashboard.

- [ ] **Step 3: Verify `.env.local` is gitignored**

Run:
```bash
git check-ignore -v .env.local
```

Expected output: a line showing `.gitignore:28:.env*    .env.local` (or similar, line number may vary). If the command exits non-zero with no output, `.env.local` is NOT gitignored — STOP and investigate before continuing.

- [ ] **Step 4: Smoke-test that Next.js reads the env vars**

Run:
```bash
npm run dev
```

Wait for the dev server to print `Ready in ...`. Then in a **separate terminal** run:

```bash
curl -s http://127.0.0.1:3000/api/auth/login
```

Expected: a 404 (the route doesn't exist yet — we build it in Task 3). This just confirms the dev server is up and reading env vars without crashing. If you see ECONNREFUSED, the server isn't actually running.

Stop the dev server (Ctrl+C) before moving to the next task.

- [ ] **Step 5: No commit for this task**

`.env.local` is gitignored. There's nothing to commit. Just record done.

---

## Task 2 — PKCE helpers + constants in `src/lib/auth.ts`

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Create `src/lib/auth.ts` with helpers, constants, types**

```typescript
import { createHash, randomBytes } from "node:crypto";

export const COOKIE_NAMES = {
  session: "spotify_session",
  pkce: "oauth_pkce",
} as const;

/**
 * All scopes we'll ever need across PRs 3-10, requested upfront so
 * existing logged-in users never get bounced back to re-consent.
 */
export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
  "user-read-currently-playing",
  "user-read-playback-state",
] as const;

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";

/**
 * Generate a cryptographically random URL-safe string suitable for
 * use as an OAuth `state` parameter or a PKCE `code_verifier`.
 *
 * PKCE `code_verifier` must be 43-128 chars from the URL-safe alphabet
 * [A-Za-z0-9-._~] per RFC 7636. base64url encoding satisfies this.
 *
 * @param byteLength Raw byte length before base64url encoding.
 *                   32 bytes → 43 chars (minimum); 64 bytes → 86 chars.
 */
export function generateRandomString(byteLength: number = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/**
 * Compute the SHA-256 hash of a code_verifier and base64url-encode it
 * for use as a PKCE `code_challenge`. The matching `code_challenge_method`
 * is always `S256` (this is the only method Spotify accepts).
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Build Spotify's `accounts.spotify.com/authorize` URL with all the
 * params required to start an Authorization Code + PKCE flow.
 */
export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  return url.toString();
}

export type PkceCookieValue = {
  state: string;
  codeVerifier: string;
};

export type SessionCookieValue = {
  accessToken: string;
  refreshToken: string;
  /** Unix milliseconds at which `accessToken` expires. */
  expiresAt: number;
};
```

- [ ] **Step 2: Verify the file type-checks**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors about `node:crypto`, the `@types/node` dep in package.json should provide types — verify it's installed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "PR 3: PKCE helpers + cookie/scope constants in lib/auth.ts

Pure functions only — generateRandomString, generateCodeChallenge,
buildAuthorizeUrl. All six future scopes declared up-front so PRs 4-6
don't trigger re-consent. SHA-256 + base64url is the only challenge
method Spotify accepts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `/api/auth/login` route

**Files:**
- Create: `src/app/api/auth/login/route.ts`

- [ ] **Step 1: Create the login route handler**

```typescript
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE_NAMES,
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateRandomString,
} from "@/lib/auth";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new NextResponse(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI env var.",
      { status: 500 },
    );
  }

  // state: anti-CSRF token. code_verifier: PKCE per-flow secret.
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAMES.pkce,
    JSON.stringify({ state, codeVerifier }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes — flow must complete in this window
    },
  );

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  return NextResponse.redirect(authorizeUrl);
}
```

- [ ] **Step 2: Smoke-test the redirect URL the route generates**

Run the dev server:
```bash
npm run dev
```

In a second terminal, follow the redirect with `curl -i` (capital `-I` would only show headers, but we want to see the body too in case of error):
```bash
curl -i http://127.0.0.1:3000/api/auth/login
```

Expected output:
- HTTP status `307` or `302` (Next.js's redirect status)
- A `Location:` header containing `https://accounts.spotify.com/authorize?client_id=eca7a4a0621c4b0e8107aa042f03b7d5&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fauth%2Fcallback&state=<random>&code_challenge=<random>&code_challenge_method=S256&scope=user-read-private+user-read-email+user-top-read+user-read-recently-played+user-read-currently-playing+user-read-playback-state`
- A `Set-Cookie: oauth_pkce=...` header containing both `state` and `codeVerifier`

If any of those are missing, debug before continuing. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "PR 3: /api/auth/login route — kicks off OAuth dance

Generates state + code_verifier, stashes both in a 10-minute httpOnly
cookie, redirects browser to accounts.spotify.com/authorize with the
SHA-256 code_challenge and all six scopes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — `/api/auth/callback` route

**Files:**
- Create: `src/app/api/auth/callback/route.ts`

- [ ] **Step 1: Create the callback route handler**

```typescript
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES, type PkceCookieValue } from "@/lib/auth";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new NextResponse(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI env var.",
      { status: 500 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Spotify returned an error (e.g., user denied consent)
  if (error) {
    return new NextResponse(`Spotify rejected the request: ${error}`, {
      status: 400,
    });
  }

  if (!code || !state) {
    return new NextResponse("Missing code or state in callback.", {
      status: 400,
    });
  }

  const cookieStore = await cookies();
  const pkceCookie = cookieStore.get(COOKIE_NAMES.pkce);
  if (!pkceCookie) {
    return new NextResponse(
      "PKCE cookie missing — flow may have expired. Try logging in again.",
      { status: 400 },
    );
  }

  let pkce: PkceCookieValue;
  try {
    pkce = JSON.parse(pkceCookie.value);
  } catch {
    return new NextResponse("PKCE cookie malformed.", { status: 400 });
  }

  // CSRF check — the state we generated at /login MUST match what
  // Spotify echoed back. If not, this callback didn't originate from
  // a flow we started.
  if (pkce.state !== state) {
    return new NextResponse("State mismatch — possible CSRF attempt.", {
      status: 400,
    });
  }

  // Exchange the authorization code for tokens (PKCE-only — no
  // client_secret in body, no Basic auth header).
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: pkce.codeVerifier,
  });

  const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    return new NextResponse(
      `Token exchange failed (${tokenResponse.status}): ${errorText}`,
      { status: 500 },
    );
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };

  cookieStore.set(
    COOKIE_NAMES.session,
    JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  );

  cookieStore.delete(COOKIE_NAMES.pkce);

  return NextResponse.redirect(new URL("/", request.url));
}
```

- [ ] **Step 2: Smoke-test rejection of bad calls (cannot fully test happy path yet — needs the UI)**

Run the dev server, then in a second terminal:

```bash
# Missing code+state → should 400
curl -i 'http://127.0.0.1:3000/api/auth/callback'

# Bogus state with no cookie → should 400 (PKCE cookie missing)
curl -i 'http://127.0.0.1:3000/api/auth/callback?code=fake&state=fake'
```

Expected: both return `HTTP/1.1 400` with a descriptive plaintext body. If either crashes with a 500 or hangs, debug before continuing. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/callback/route.ts
git commit -m "PR 3: /api/auth/callback route — finishes OAuth dance

Validates state (CSRF check), exchanges authorization code for
tokens via PKCE token-exchange (no client_secret), stores access +
refresh + expiresAt in a 30-day httpOnly cookie, deletes the
short-lived oauth_pkce cookie, redirects home.

Rejects malformed requests with 400 + plaintext body for now —
prettier error UI can come later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — `/api/auth/logout` route

**Files:**
- Create: `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Create the logout route handler**

```typescript
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/auth";

/**
 * Logout is POST (not GET) because it's a state-changing action.
 * Returns 303 so the browser follows with a fresh GET to `/`.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.session);
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
```

- [ ] **Step 2: Smoke-test the route**

Run the dev server, then:

```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/logout
```

Expected:
- HTTP `303 See Other`
- `Location: http://127.0.0.1:3000/`
- A `Set-Cookie: spotify_session=; ...; Max-Age=0` header (deletes the cookie even if it wasn't set — that's the contract of `cookieStore.delete()`)

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "PR 3: /api/auth/logout route — clears the session

POST only (logout is state-changing). 303 redirect ensures the
browser follows with a GET to /, which renders the anonymous state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — `src/lib/spotify.ts` (session reader + `/v1/me` helper)

**Files:**
- Create: `src/lib/spotify.ts`

- [ ] **Step 1: Create the file with `getSession()` and `getMe()`**

```typescript
import { cookies } from "next/headers";
import { COOKIE_NAMES, type SessionCookieValue } from "@/lib/auth";

const SPOTIFY_API = "https://api.spotify.com/v1";

/**
 * Read and parse the spotify_session cookie. Returns null if missing,
 * malformed, or missing required fields. Caller should treat null as
 * "user is not logged in."
 */
export async function getSession(): Promise<SessionCookieValue | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAMES.session);
  if (!sessionCookie) return null;

  let session: unknown;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }

  if (
    typeof session !== "object" ||
    session === null ||
    typeof (session as SessionCookieValue).accessToken !== "string" ||
    typeof (session as SessionCookieValue).refreshToken !== "string" ||
    typeof (session as SessionCookieValue).expiresAt !== "number"
  ) {
    return null;
  }

  return session as SessionCookieValue;
}

export type SpotifyProfile = {
  id: string;
  display_name: string | null;
  email: string;
};

export type GetMeResult =
  | { ok: true; profile: SpotifyProfile }
  | { ok: false; status: number };

/**
 * Call Spotify's `/v1/me` with the given access token.
 *
 * - 200 → returns the user's profile
 * - 401 → access token expired or revoked (caller should show "session expired")
 * - other non-2xx → returns the status so caller can decide what to do
 *
 * `cache: "no-store"` because authenticated responses must never be
 * cached at the Next.js fetch layer.
 */
export async function getMe(accessToken: string): Promise<GetMeResult> {
  const response = await fetch(`${SPOTIFY_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const profile = (await response.json()) as SpotifyProfile;
  return { ok: true, profile };
}
```

- [ ] **Step 2: Verify type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/spotify.ts
git commit -m "PR 3: session reader + getMe helper in lib/spotify.ts

getSession parses + validates the spotify_session cookie, returning
null for missing/malformed cookies so callers can branch cleanly.
getMe wraps Spotify GET /v1/me with explicit no-store caching and
returns a discriminated union of ok/not-ok so the home page can
render its three states without exception handling.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — Login + Logout button components

**Files:**
- Create: `src/components/auth/login-button.tsx`
- Create: `src/components/auth/logout-button.tsx`

**Note:** Both are Server Components (no `"use client"` directive). Base UI's `<Button>` uses `render` for polymorphism — NOT `asChild`.

- [ ] **Step 1: Create `src/components/auth/login-button.tsx`**

```typescript
import { Button } from "@/components/ui/button";

export function LoginButton({
  label = "Log in with Spotify",
}: {
  label?: string;
}) {
  return (
    <Button
      render={<a href="/api/auth/login" />}
      nativeButton={false}
      className="w-full"
    >
      {label}
    </Button>
  );
}
```

- [ ] **Step 2: Create `src/components/auth/logout-button.tsx`**

```typescript
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <Button type="submit" variant="outline" className="w-full">
        Log out
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Verify type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see "render is not assignable" — re-check the Base UI signature (this is the most likely place for that error).

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/login-button.tsx src/components/auth/logout-button.tsx
git commit -m "PR 3: LoginButton + LogoutButton Server Components

LoginButton uses Base UI Button's render prop to wrap an <a href>
in the shadcn styling (no asChild — the Button is built on
@base-ui/react, not Radix). LogoutButton is a <form method='POST'>
wrapping a submit Button so logout works without any client JS.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — Wire up the home page with three render states

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx` entirely**

```typescript
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { getMe, getSession } from "@/lib/spotify";

type ViewState =
  | { kind: "anonymous" }
  | { kind: "logged-in"; displayName: string }
  | { kind: "expired" };

async function resolveViewState(): Promise<ViewState> {
  const session = await getSession();
  if (!session) return { kind: "anonymous" };

  const result = await getMe(session.accessToken);
  if (result.ok) {
    return {
      kind: "logged-in",
      // display_name can be null (rare). Fall back to the user's Spotify ID.
      displayName: result.profile.display_name ?? result.profile.id,
    };
  }
  return { kind: "expired" };
}

export default async function Home() {
  const view = await resolveViewState();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-2xl leading-snug font-medium">
            Spotify Wrapped
          </h1>
          {view.kind === "anonymous" && (
            <CardDescription>Your listening, your year.</CardDescription>
          )}
          {view.kind === "logged-in" && (
            <CardDescription>
              Logged in as <strong>{view.displayName}</strong>
            </CardDescription>
          )}
          {view.kind === "expired" && (
            <CardDescription>Your session expired.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {view.kind === "logged-in" ? <LogoutButton /> : <LoginButton />}
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Type-check + ensure dev server boots**

```bash
npx tsc --noEmit
```

Expected: no errors.

Then:
```bash
npm run dev
```

Wait for `Ready in ...`. Open `http://127.0.0.1:3000` in a regular browser tab — you should see the same Card layout, with an **enabled** "Log in with Spotify" button (not the previous `disabled` state). Don't click it yet — we verify the full flow at Task 9.

Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "PR 3: wire home page to three render states

resolveViewState() reads the session, calls getMe, returns a
discriminated union the render code consumes. Three states:
anonymous (default), logged-in (shows display_name + logout),
expired (shows 'session expired' + fresh login).

Replaces the disabled placeholder Button with the real flow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — End-to-end OAuth verification via Claude in Chrome

**Files:** none — verification only.

**Note:** This is the Explain-Show-Test loop from CLAUDE.md applied to OAuth. Claude drives the browser via the Claude in Chrome MCP, takes screenshots, and reports what it sees. Will watches and confirms each step matches expectations.

### Pre-check

- [ ] **Step 1: Confirm the dev server is OFF, then start fresh**

```bash
npm run dev
```

This restart is important — env vars from `.env.local` are only loaded at startup. If the server was already running before `.env.local` was created in Task 1, it won't see them.

Wait for `Ready in ...`. **Visit `http://127.0.0.1:3000`** in the browser — NOT `localhost:3000`. See the "Why" callout at the top of this plan for the gotcha.

### Happy path

- [ ] **Step 2: State 1 — anonymous (screenshot)**

Claude in Chrome opens `http://127.0.0.1:3000`. Screenshot. Confirm:
- Card heading: "Spotify Wrapped"
- CardDescription: "Your listening, your year."
- Button text: "Log in with Spotify"
- Button is **enabled** (no faded/disabled appearance)

- [ ] **Step 3: Click "Log in with Spotify"**

Claude in Chrome clicks the button. Browser should redirect to `accounts.spotify.com`. Screenshot. Confirm:
- URL bar shows `accounts.spotify.com/authorize?...`
- Spotify's consent screen lists six scope items (profile, top tracks, recently played, currently playing, playback state, email — wording may vary)
- "Agree" / "Cancel" buttons visible

If Spotify shows an "Invalid redirect URI" error → STOP. Check Task 1 Step 1: both redirect URIs must be registered exactly. Most common cause: visiting `localhost:3000` instead of `127.0.0.1:3000`.

- [ ] **Step 4: Click "Agree" on Spotify's consent screen**

Browser bounces through `/api/auth/callback?code=...&state=...` and lands back at `/`. Screenshot. Confirm:
- URL bar shows `http://127.0.0.1:3000/`
- Card heading: "Spotify Wrapped"
- CardDescription: "Logged in as **`<Will's Spotify display name>`**" — display name in bold
- Button text: "Log out"

- [ ] **Step 5: Inspect the `spotify_session` cookie**

In Chrome DevTools (Claude can drive this): Application → Cookies → `http://127.0.0.1:3000` → `spotify_session`. Confirm:
- Name: `spotify_session`
- Value: a JSON string starting with `{"accessToken":"BQ...`
- HttpOnly: ✓ (true)
- Secure: ✗ (false, because local is HTTP)
- SameSite: `Lax`
- Path: `/`
- Expires: ~30 days from now

Also confirm the `oauth_pkce` cookie is **gone** (deleted by the callback handler at the end of Task 4).

- [ ] **Step 6: Click "Log out"**

Browser submits the form, hits `/api/auth/logout`, redirects back to `/`. Screenshot. Confirm:
- Card is back to State 1 (anonymous)
- DevTools → Application → Cookies → `spotify_session` is gone

### Edge cases

- [ ] **Step 7: State 3 — session expired**

Log back in (repeat Steps 3-4). Now in DevTools → Application → Cookies → `spotify_session`, edit the **value**: change a chunk of characters in the `accessToken` field (e.g., change the first 10 chars of the access token to `XXXXXXXXXX`). Click somewhere else to commit the edit. Reload `/`.

Confirm: the page now shows State 3 — "Your session expired." + "Log in with Spotify" button. The cookie is still there (we don't auto-delete on expired) but `getMe()` returned 401 because Spotify rejected the corrupted token.

Note: corrupting the `expiresAt` field alone won't trigger State 3 in PR 3 — the home page doesn't check that field. It only branches on Spotify's 401. PR 4 changes this when middleware-based refresh lands.

- [ ] **Step 8: CSRF check — direct hit to callback**

Open an incognito tab (Cmd+Shift+N). Navigate to `http://127.0.0.1:3000/api/auth/callback?code=fake&state=fake`. Confirm: page shows a plain-text 400 response ("PKCE cookie missing — flow may have expired"). Not a 500, not a crash.

- [ ] **Step 9: Stop the dev server**

Ctrl+C in the terminal running `npm run dev`.

- [ ] **Step 10: No commit — verification only**

If something failed, fix and re-verify before continuing. If everything passed, move to Task 10.

---

## Task 10 — Configure Vercel env vars + push

**Files:** none in this repo — Vercel dashboard config.

- [ ] **Step 1: Add the three env vars to Vercel's Production environment**

Run:
```bash
vercel env add SPOTIFY_CLIENT_ID production
```

When prompted for the value, paste `eca7a4a0621c4b0e8107aa042f03b7d5`. Confirm.

```bash
vercel env add SPOTIFY_CLIENT_SECRET production
```

When prompted, paste the value from Will's password manager.

```bash
vercel env add SPOTIFY_REDIRECT_URI production
```

When prompted, paste `https://spotify-wrapped-lemon.vercel.app/api/auth/callback`. Note the **`https://`** and the **Vercel URL** (not `127.0.0.1`).

Verify:
```bash
vercel env ls
```

Expected: three rows for the three vars, environment column showing "Production" (or "Production, Preview, Development" if you opted to apply to multiple — for now Production only is fine).

- [ ] **Step 2: Push the branch + open the PR**

```bash
git push -u origin pr-3-oauth
```

Then:
```bash
gh pr create --base main --head pr-3-oauth \
  --title "PR 3 — Spotify OAuth handshake" \
  --body "$(cat <<'EOF'
First PR of Phase 2. Wires the disabled 'Log in with Spotify' button on / to a real Spotify OAuth flow (Authorization Code + PKCE), drops the user back on / showing 'Logged in as <display_name>'.

## What's in this PR

- Three new route handlers under \`src/app/api/auth/\` (login, callback, logout)
- Two new lib helpers: \`src/lib/auth.ts\` (PKCE) + \`src/lib/spotify.ts\` (session + /v1/me)
- Two new Server Components: \`LoginButton\`, \`LogoutButton\`
- Rewritten \`src/app/page.tsx\` with three render states (anonymous, logged-in, expired)
- All six future scopes requested upfront (user-read-private, user-read-email, user-top-read, user-read-recently-played, user-read-currently-playing, user-read-playback-state)

## Out of scope (deferred)

- Token refresh → PR 4 (middleware-based, when API calls need it)
- Cookie encryption/signing → indefinite (httpOnly + sameSite=lax already covers realistic attacks)
- Any real Spotify data beyond /v1/me → PR 4+
- Automated tests of the OAuth flow → manual verification only

## Spec

See [docs/superpowers/specs/2026-05-27-pr-3-spotify-oauth-design.md](docs/superpowers/specs/2026-05-27-pr-3-spotify-oauth-design.md) for the full design + tradeoffs.

## Verification

Tested locally end-to-end via Claude in Chrome — all three render states reachable, cookie attributes correct, CSRF check rejects direct callback hits.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for Vercel preview deploy + verify production handshake**

After the push, Vercel will auto-build. Run:
```bash
vercel ls spotify-wrapped --scope will-putman-s-projects 2>/dev/null | head -5
```

Wait until the most recent deployment status is "Ready" (may take 1-2 minutes). The PR will also show a "Vercel" comment with a preview URL once ready.

Then verify production:
- Open `https://spotify-wrapped-lemon.vercel.app/` in a fresh browser tab
- Confirm State 1 renders
- Click "Log in with Spotify"
- Complete the consent on Spotify
- Confirm redirect lands on `https://spotify-wrapped-lemon.vercel.app/` with State 2 ("Logged in as ...")
- DevTools → Cookies → `spotify_session` → **Secure: ✓** (true, because production is HTTPS)
- Click logout, confirm State 1 returns

If production fails but local worked → most likely cause is `SPOTIFY_REDIRECT_URI` mismatch. Check that the Vercel env var matches the URI registered in Spotify's dashboard exactly.

- [ ] **Step 4: No commit — push + PR open are the artifact**

---

## Task 11 — Self-review with `/code-review`

**Files:** none — review pass on the open PR.

- [ ] **Step 1: Run `/code-review` on the branch**

In Claude Code, run:
```
/code-review
```

This reviews the current diff against `main`. Read each finding. For each one, decide:
- **Fix in this PR** — real bugs, security issues, things that would confuse a future reader
- **Defer with a follow-up** — out-of-scope improvements
- **Dismiss** — false positives or things the spec explicitly chose

- [ ] **Step 2: Triage findings in dialog with Will**

For each finding, tell Will:
- What `/code-review` flagged
- Plain-English explanation of whether it's a real issue
- Recommended action (fix / defer / dismiss)

Get his decision before acting.

- [ ] **Step 3: Address fixes (if any)**

For each finding marked "fix": make the edit, commit with message `PR 3 review fix: <short description>`, push.

For each "defer": use `mcp__ccd_session__spawn_task` to flag a follow-up chip in Will's UI with enough context for a separate session to act on.

- [ ] **Step 4: Push any fixes**

```bash
git push
```

Wait for Vercel to redeploy. Re-verify production briefly (Task 10 Step 3 happy path) if any fixes touched OAuth logic.

---

## Task 12 — Merge the PR

**Files:** none — merge on github.com.

- [ ] **Step 1: Merge the PR**

```bash
gh pr merge pr-3-oauth --squash --delete-branch
```

(Or Will can click "Squash and merge" on github.com — same result.)

- [ ] **Step 2: Pull the merged commit into local main**

```bash
git checkout main
git pull origin main
```

- [ ] **Step 3: Verify the merged production deploy**

Vercel auto-deploys `main`. After ~1 min, visit `https://spotify-wrapped-lemon.vercel.app/` and confirm the flow still works.

- [ ] **Step 4: Tick the boxes in PROGRESS.md**

Open `PROGRESS.md` in Zed. Under "PR 3 · OAuth handshake works", tick the first **five** boxes (lines 267-271):
- [x] Branch → brainstorm OAuth conceptually → plan → execute
- [x] Set up environment variables for your Spotify Client ID + Secret
- [x] Implement the OAuth 2.0 PKCE flow
- [x] Verify: click "Log in with Spotify," go through the real flow, see your username on screen
- [x] PR → self-review → merge → deploy

Leave the last two (line 272 + 273) unchecked — those are the next two tasks.

---

## Task 13 — Build Will's own `/handoff` skill

**Files:**
- Create: `~/.claude/skills/handoff/SKILL.md` (and any helper files the writing-skills skill produces)

**Note:** This is a personal skill, NOT part of the PR. It lives in Will's user-level Claude config, not in the repo.

- [ ] **Step 1: Brainstorm the skill briefly with Will**

Before invoking `/superpowers:writing-skills`, talk through what the skill should do:

- **When to trigger:** end of a session, when Will asks "wrap up" / "handoff" / "save where we are"
- **What it writes:** a markdown file at `docs/handoffs/session-<N>.md` in the project
- **What's in the file:** the shape session 6's handoff used — where Will is in PROGRESS.md, what got done this session, critical things to remember, repo state, what to do next session
- **Commit pattern:** the doc rides along with the next wrap-up commit (don't auto-commit it)

This is a 2-minute brainstorm, not a full design pass. The shape is already proven in session 6.

- [ ] **Step 2: Invoke `/superpowers:writing-skills`**

```
/superpowers:writing-skills
```

Tell the skill: "Build a personal `/handoff` skill that writes a session summary to `docs/handoffs/session-<N>.md` in the current project, following the format established in `docs/handoffs/session-6.md`."

Let the writing-skills skill drive from there. It'll ask its own clarifying questions, draft the skill, and place it in `~/.claude/skills/handoff/`.

- [ ] **Step 3: Verify the skill is loadable**

In Claude Code, type `/handoff` and confirm it appears in the slash-command autocomplete. (If it doesn't, the writing-skills skill will have produced a debug step — follow that.)

- [ ] **Step 4: Tick PROGRESS.md line 272**

In Zed, change:
```
- [ ] **Build your own `/handoff` skill**
```
to:
```
- [x] **Build your own `/handoff` skill**
```

---

## Task 14 — Use the new `/handoff` skill to end the session

- [ ] **Step 1: Invoke the new skill**

```
/handoff
```

Let it write `docs/handoffs/session-7.md` (or whatever number is next). Will reviews it before the session closes.

The handoff doc should mention, prominently:
- PR 3 is merged
- The `--font-sans` CSS recursion is still outstanding (spawn-task chip)
- PR 4 (first real data) is next — and PR 4 introduces middleware-based token refresh, which is the prerequisite for any data fetching that survives the 1-hour access-token expiry
- The PR 3 handoff includes the still-uncommitted session-6.md doc (rides along with whatever the next wrap-up commit is — at this point, the `/handoff` skill should encode that convention or pick a different one)

Actually — since session-6.md is currently sitting in the working tree as untracked from this branch, and PR 3 has just been merged: by this point session-6.md should have been committed as part of the PR 3 wrap-up. Confirm `git status` is clean except for the new session-7 doc.

- [ ] **Step 2: Tick PROGRESS.md line 273**

```
- [x] **Use your new skill** to end this session.
```

- [ ] **Step 3: Session is done**

PR 3 is shipped. The `/handoff` skill exists. PROGRESS.md is up to date. Next session opens fresh with PR 4.

---

## Self-review checklist (for the implementer before claiming done)

Before declaring PR 3 complete, run through:

- [ ] All three render states reachable in production (not just local)
- [ ] `spotify_session` cookie has `Secure: ✓` in production, `Secure: ✗` locally
- [ ] `oauth_pkce` cookie is **deleted** after a successful callback (DevTools should show it missing)
- [ ] Direct hit to `/api/auth/callback?code=fake&state=fake` returns 400, not 500
- [ ] `npx tsc --noEmit` exits cleanly
- [ ] No accidental commits of `.env.local`
- [ ] PROGRESS.md PR 3 section has all seven boxes ticked
- [ ] `git log --oneline main..HEAD` (before merge) shows one commit per task — no batched edits
- [ ] Spec follow-ups are still followed-up (font-sans chip, handoff doc commit pattern)

## Things that could go sideways during execution

- **`@base-ui/react` Button doesn't render the `<a>` correctly** → the `render` prop expects a React element; if it errors, try `render={(props) => <a href="..." {...props} />}` (function form). Either form is documented.
- **`vercel env add` prompts for environments to apply to** → answer "Production" (or all three; doesn't matter, we just need Production live).
- **Vercel build fails on `"node:crypto"` import** → vanishingly unlikely in Next 16, but if it happens, change the import to `crypto` (without the `node:` prefix). Both work in Node 22+.
- **Spotify returns `INVALID_CLIENT` on the token exchange** → 95% of the time means the `client_id` in `.env.local` is wrong, or the `redirect_uri` doesn't match what's registered in Spotify's dashboard (down to the trailing slash). Compare both byte-for-byte.
- **Cookies don't persist across the Spotify redirect** → check `sameSite` is `lax`, not `strict`. `strict` blocks cookies on incoming cross-site redirects, which is exactly what Spotify's redirect IS from the browser's perspective.
