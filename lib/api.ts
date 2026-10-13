/**
 * The browser's door to the Laravel API.
 *
 * Every call goes to this site's own /api (a small proxy we add next), never straight to Laravel.
 * The proxy attaches the login token from an httpOnly cookie, so no code in the browser ever sees it.
 *
 * Money: this file never converts amounts. Convert per field with lib/money.ts.
 * Files: send a FormData body with POST. PHP does not read uploaded files on PUT or PATCH.
 */

import { ApiError, apiErrorFromResponse, readJson } from "@/lib/api-error";

export { ApiError } from "@/lib/api-error";
export type { FieldErrors } from "@/lib/api-error";

const BASE = "/api";

type Primitive = string | number | boolean | null | undefined;
type Query = Record<string, Primitive | Primitive[]>;

type RequestOptions = {
  query?: Query;
  /** A plain object is sent as JSON. FormData is sent as-is (file uploads). */
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Treat a 401 as an ordinary error, not as "your session ended". Set it on calls where a 401 is
   * an expected answer: logging in with a wrong password, or asking "am I logged in?".
   */
  quiet401?: boolean;
};

let onUnauthenticated: (() => void) | null = null;

/** The login provider registers this once, to send people to the login page when their session ends. */
export function setUnauthenticatedHandler(handler: (() => void) | null) {
  onUnauthenticated = handler;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    const isList = Array.isArray(value);

    for (const item of isList ? value : [value]) {
      if (item === undefined || item === null || item === "") continue;

      // Laravel's boolean rule accepts 1 and 0, but not the text "true" or "false".
      const text = typeof item === "boolean" ? (item ? "1" : "0") : String(item);
      params.append(isList ? `${key}[]` : key, text);
    }
  }

  const queryString = params.toString();

  return `${BASE}${path}${queryString ? `?${queryString}` : ""}`;
}

async function request<T>(
  method: string,
  path: string,
  { query, body, signal, quiet401 = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body; // the browser adds the multipart boundary itself
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: payload,
      signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error; // cancelled on purpose

    throw new ApiError(0, "We can't reach the server. Check your connection and try again.");
  }

  const data = await readJson(response);

  if (!response.ok) {
    if (response.status === 401 && !quiet401) onUnauthenticated?.();

    throw apiErrorFromResponse(response, data);
  }

  return data as T;
}

type CallOptions = Omit<RequestOptions, "body">;

export const api = {
  get: <T>(path: string, options?: CallOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: CallOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: CallOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: CallOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: CallOptions) => request<T>("DELETE", path, options),
};