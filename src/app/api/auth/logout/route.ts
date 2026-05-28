import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/auth";
import { sameHostUrl } from "@/lib/url";

/**
 * Logout is POST (not GET) because it's a state-changing action.
 * Returns 303 so the browser follows with a fresh GET to `/`.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.session);
  return NextResponse.redirect(sameHostUrl(request, "/"), { status: 303 });
}
