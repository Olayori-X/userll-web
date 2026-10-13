/**
 * Where the login token lives: an httpOnly cookie set by our own server.
 *
 * Server only. Never import this from a component marked "use client".
 */

import { cookies } from "next/headers";

/**
 * The "__Host-" prefix makes browsers refuse the cookie unless it is Secure, set for the whole site,
 * and not shared with subdomains, so a sibling subdomain cannot overwrite it. It needs https,
 * so on http://localhost we use a plain name.
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-userll_session" : "userll_session";

/**
 * Matches the API's token lifetime (SANCTUM_TOKEN_EXPIRY_MINUTES=43200, which is 30 days).
 * The API has the final say: an expired token gets a 401, and the proxy then clears this cookie.
 */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true, // page scripts can never read it, so an XSS bug cannot steal the token
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // not sent on cross-site form posts
    path: "/",
    maxAge,
  };
}

/** The API token for this request, or null when logged out. For server components and route handlers. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();

  return store.get(SESSION_COOKIE)?.value ?? null;
}