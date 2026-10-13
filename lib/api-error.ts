/**
 * How the Laravel API reports problems, turned into one error type.
 *
 * Pure code: no browser, no Next.js. The browser client (lib/api.ts) and the server-side
 * code both use it, so a failure looks the same wherever it happens.
 */

const GENERIC_MESSAGE = "Something went wrong on our side. Please try again.";

/** Laravel's validation errors: field name -> list of messages. */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly errors: FieldErrors;
  /** Seconds to wait before retrying, when the server rate-limited us (429). */
  readonly retryAfter: number | null;

  constructor(status: number, message: string, errors: FieldErrors = {}, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }

  /** 422: the form has field errors to show. */
  get isValidation() {
    return this.status === 422;
  }

  /** 401: not logged in, or the session has expired. */
  get isUnauthenticated() {
    return this.status === 401;
  }

  /** 429: too many requests. */
  get isRateLimited() {
    return this.status === 429;
  }

  /** The first message for one field, to show under its input. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

/** Reads a response body as JSON. Gives undefined for an empty body, a 204, or text that is not JSON. */
export async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return undefined; // for example an error page from a server in between
  }
}

function isFieldErrors(value: unknown): value is FieldErrors {
  if (!value || typeof value !== "object") return false;

  return Object.values(value).every((messages) => Array.isArray(messages) && messages.every((m) => typeof m === "string"));
}

/** Builds the error for a failed response. `body` is what readJson gave back. */
export function apiErrorFromResponse(response: Response, body: unknown): ApiError {
  const data = (body && typeof body === "object" ? body : {}) as { message?: unknown; errors?: unknown };
  const serverMessage = typeof data.message === "string" && data.message ? data.message : null;
  const errors = isFieldErrors(data.errors) ? data.errors : {};

  const retryHeader = Number(response.headers.get("Retry-After"));
  const retryAfter = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null;

  let message: string;

  if (response.status === 429) {
    message = "Too many attempts. Please wait a moment and try again.";
  } else if (response.status === 404) {
    message = "We couldn't find what you were looking for."; // Laravel's own 404 text can include internal model names
  } else if (response.status === 500 || !serverMessage) {
    message = GENERIC_MESSAGE;
  } else {
    message = serverMessage;
  }

  return new ApiError(response.status, message, errors, retryAfter);
}