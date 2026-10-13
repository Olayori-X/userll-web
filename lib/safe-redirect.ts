/**
 * Where to send someone after they sign in, taken from the ?next= part of the link.
 *
 * Only paths on this site are accepted. Anything else (another website, "//evil.com", "javascript:...",
 * a backslash trick) is replaced by the fallback, so a crafted login link cannot send people elsewhere.
 */

/** Never send someone back to a page they would only be sent away from again. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

const MAX_LENGTH = 2048;

/** Any made-up address works. It only exists so the browser's own URL parser can tell us whether the target is ours. */
const PLACEHOLDER_ORIGIN = "http://placeholder.invalid";

export function safeRedirectPath(value: string | string[] | null | undefined, fallback = "/"): string {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw || raw.length > MAX_LENGTH || !raw.startsWith("/")) return fallback;

  try {
    // The URL parser reads "//evil.com" and "/\evil.com" as other websites. If the result is not
    // on our placeholder origin, the link was pointing elsewhere.
    const url = new URL(raw, PLACEHOLDER_ORIGIN);

    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;

    if (AUTH_PAGES.some((page) => url.pathname === page || url.pathname.startsWith(`${page}/`))) return fallback;

    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}