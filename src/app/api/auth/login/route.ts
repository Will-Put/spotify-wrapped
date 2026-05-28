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
