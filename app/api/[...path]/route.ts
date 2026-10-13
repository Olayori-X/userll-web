/**
 * The proxy between the browser and the Laravel API.
 *
 *   browser  ->  /api/listings  ->  this file  ->  API_BASE_URL/listings
 *
 * What it does for us:
 *  - keeps the login token in an httpOnly cookie: it is taken from the login response and never shown to the
 *    browser, then attached to later requests here
 *  - refuses writes that did not come from our own site (a guard against cross-site request forgery)
 *  - passes the visitor's real address to Laravel, which uses it for its rate limits
 *  - never forwards /webhooks/*: Paystack talks to Laravel directly
 */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

type RouteContext = { params: Promise<{ path: string[] }> };

const UPSTREAM_TIMEOUT_MS = 30_000;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** These two answers carry a new token, which we move into the cookie. */
const TOKEN_PATHS = new Set(["auth/login", "auth/register"]);
const LOGOUT_PATH = "auth/logout";

/** Paths that are never forwarded. */
const BLOCKED_FIRST_SEGMENTS = new Set(["webhooks"]);

/** Letters, digits and . _ ~ : @ + - only. Rules out "..", slashes, spaces and other tricks. */
const SAFE_SEGMENT = /^[A-Za-z0-9._~:@+-]+$/;

/** The only headers we copy from Laravel's answer. Length and encoding are left out on purpose: they would be wrong. */
const RELAYED_HEADERS = ["content-type", "content-disposition", "retry-after", "location"];

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

function apiBase(): string | null {
  return process.env.API_BASE_URL?.replace(/\/+$/, "") || null;
}

function siteOrigin(): string | null {
  try {
    return process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : null;
  } catch {
    return null;
  }
}

/** The path under the API, or null if it is empty, blocked or suspicious. */
function cleanPath(segments: string[]): string | null {
  if (segments.length === 0) return null;
  if (BLOCKED_FIRST_SEGMENTS.has(segments[0])) return null;
  if (segments.some((segment) => segment === "." || segment === ".." || !SAFE_SEGMENT.test(segment))) return null;

  return segments.join("/");
}

/** Writes must come from our own pages. Browsers always say where a write came from. */
function isOwnSite(request: NextRequest): boolean {
  const expected = siteOrigin();
  if (!expected) return false;

  const origin = request.headers.get("origin");

  if (origin) return origin === expected;

  return request.headers.get("sec-fetch-site") === "same-origin"; // some browsers leave Origin out of same-site writes
}

function clearSession(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

/** Laravel's answer, passed on as it is (streamed, so images and downloads work too). */
function relay(upstream: Response): NextResponse {
  const headers = new Headers({ "Cache-Control": "private, no-store" });

  for (const name of RELAYED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasNoBody = [204, 205, 304].includes(upstream.status) || (upstream.status >= 300 && upstream.status < 400);

  return new NextResponse(hasNoBody ? null : upstream.body, { status: upstream.status, headers });
}

async function handle(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const base = apiBase();

  if (!base) {
    console.error("API_BASE_URL is not set. Add it to .env.local.");

    return jsonError("The server is not set up correctly. Please try again later.", 500);
  }

  const { path: segments } = await context.params;
  const path = cleanPath(segments);

  if (!path) return jsonError("We couldn't find what you were looking for.", 404);

  const method = request.method.toUpperCase();

  if (UNSAFE_METHODS.has(method) && !isOwnSite(request)) {
    return jsonError("This request was blocked. Please reload the page and try again.", 403);
  }

  const isTokenPath = method === "POST" && TOKEN_PATHS.has(path);
  const isLogout = method === "POST" && path === LOGOUT_PATH;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const headers = new Headers({ Accept: "application/json" });

  for (const name of ["content-type", "user-agent", "x-forwarded-for"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (token && !isTokenPath) headers.set("Authorization", `Bearer ${token}`);

  let body: ArrayBuffer | undefined;

  if (method !== "GET" && method !== "HEAD") {
    const bytes = await request.arrayBuffer();
    body = bytes.byteLength > 0 ? bytes : undefined;
  }

  let upstream: Response;

  try {
    upstream = await fetch(`${base}/${path}${request.nextUrl.search}`, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    const failure = timedOut
      ? jsonError("The server took too long to respond. Please try again.", 504)
      : jsonError("We can't reach the server right now. Please try again in a moment.", 502);

    if (isLogout) clearSession(failure); // logging out always works on this side

    return failure;
  }

  // Login and register: the token goes into the cookie, and only the user goes back to the browser.
  if (isTokenPath && upstream.ok) {
    const data = (await upstream.json().catch(() => null)) as { token?: unknown; [key: string]: unknown } | null;

    if (!data || typeof data.token !== "string") {
      return jsonError("We couldn't start your session. Please try again.", 502);
    }

    const { token: newToken, ...rest } = data;
    const response = NextResponse.json(rest, { status: upstream.status, headers: { "Cache-Control": "no-store" } });

    response.cookies.set(SESSION_COOKIE, newToken, sessionCookieOptions());

    return response;
  }

  const response = relay(upstream);

  // Logged out, or the API no longer accepts our token (expired, revoked, or the account was suspended).
  if (isLogout || (upstream.status === 401 && token && !isTokenPath)) clearSession(response);

  return response;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;