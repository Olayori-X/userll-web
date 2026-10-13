/**
 * Reading data from the Laravel API on the server, while a page is being built.
 *
 * The browser's client (lib/api.ts) goes through our /api proxy. Pages built on the server do not need
 * that detour: they call Laravel directly, so the HTML arrives with the products already in it, which is
 * what search engines read and what loads fastest.
 *
 * Reads only. Anything that changes data (login, checkout, orders) goes through the browser client and the proxy.
 * Server only: never import this from a component marked "use client".
 */

import { headers } from "next/headers";
import { ApiError, apiErrorFromResponse, readJson } from "@/lib/api-error";
import { toQueryString, type Query } from "@/lib/query-string";
import { getSessionToken } from "@/lib/session";

const TIMEOUT_MS = 15_000;

type ServerGetOptions = {
  query?: Query;
  /**
   * How many seconds an answer may be reused before asking Laravel again. Leave it out for "fresh every time".
   * For public data only: for example 300 for the category list, 60 for the newest listings.
   */
  revalidate?: number;
  /**
   * Act as the person who is logged in (their orders, their cart). Such answers are never reused between
   * visitors, and a page that asks for one is built per request.
   */
  authenticated?: boolean;
};

function baseUrl(): string {
  const url = process.env.API_BASE_URL?.replace(/\/+$/, "");

  if (!url) {
    console.error("API_BASE_URL is not set. Add it to .env.local.");

    throw new ApiError(500, "The server is not set up correctly. Please try again later.");
  }

  return url;
}

export async function serverGet<T>(path: string, { query, revalidate, authenticated = false }: ServerGetOptions = {}): Promise<T> {
  const base = baseUrl();
  const requestHeaders: Record<string, string> = { Accept: "application/json" };

  if (authenticated) {
    const token = await getSessionToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;

    // So Laravel's rate limits see the visitor, not this server.
    const forwarded = (await headers()).get("x-forwarded-for");
    if (forwarded) requestHeaders["X-Forwarded-For"] = forwarded;
  }

  // Private answers are never cached. Public ones only when the caller says for how long.
  const caching = authenticated || !revalidate ? { cache: "no-store" as const } : { next: { revalidate } };

  let response: Response;

  try {
    response = await fetch(`${base}${path}${toQueryString(query)}`, {
      method: "GET",
      headers: requestHeaders,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...caching,
    });
  } catch {
    throw new ApiError(502, "We can't reach the server right now. Please try again in a moment.");
  }

  const data = await readJson(response);

  if (!response.ok) throw apiErrorFromResponse(response, data);

  return data as T;
}

/** Like serverGet, but a 404 gives null, so a page can call notFound() instead of showing an error. */
export async function serverGetOrNull<T>(path: string, options?: ServerGetOptions): Promise<T | null> {
  try {
    return await serverGet<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;

    throw error;
  }
}