import type { NextRequest } from "next/server";

/**
 * Build a URL for a path on the same host as the incoming request.
 *
 * Why this exists: in Next.js dev mode, `request.url` is hard-coded
 * to `localhost` regardless of the actual `Host` header. So a redirect
 * via `new URL("/", request.url)` would send the browser to a
 * DIFFERENT origin than the one it's currently on (e.g., 127.0.0.1 →
 * localhost), and the browser would drop cookies in the transition.
 * That breaks OAuth.
 *
 * Reading the Host header instead gives us the host the client actually
 * connected to. In production behind a proxy (e.g., Vercel), the
 * client-visible host arrives as `x-forwarded-host`.
 */
export function sameHostUrl(request: NextRequest, path: string): URL {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  return new URL(path, `${proto}://${host}`);
}
