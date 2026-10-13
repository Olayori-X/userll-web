/**
 * Puts what the API said went wrong into a react-hook-form form.
 *
 *   const banner = applyApiErrors(error, form.setError, ["email", "password"]);
 *   setFormError(banner); // show it in an <Alert> above the button, or nothing when it is null
 *
 * Problems with a field appear under that field. Anything else comes back as one message for the top of
 * the form: a wrong password, a rate limit, the server being down, an expired reset link.
 *
 * `fields` must list the form's field names. They are the API's names, because the forms use them as is.
 */

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api-error";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

function rateLimitMessage(error: ApiError): string {
  const seconds = error.retryAfter;

  if (!seconds) return error.message;
  if (seconds < 90) return `Too many attempts. Please try again in ${Math.ceil(seconds)} seconds.`;

  return `Too many attempts. Please try again in ${Math.ceil(seconds / 60)} minutes.`;
}

export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return FALLBACK_MESSAGE;

  if (error.isRateLimited) return rateLimitMessage(error);

  if (!error.isValidation) return error.message;

  const known = new Set<string>(fields);
  const leftovers: string[] = [];
  let focused = false;

  for (const [field, messages] of Object.entries(error.errors)) {
    const message = messages[0];
    if (!message) continue;

    if (known.has(field)) {
      // Only the first problem field takes focus, so the cursor lands where the person should look first.
      setError(field as Path<T>, { type: "server", message }, { shouldFocus: !focused });
      focused = true;
    } else {
      leftovers.push(message); // the API named a field this form does not have
    }
  }

  if (leftovers.length > 0) return leftovers.join(" ");

  // A 422 that carries no field errors at all (for example "This reset link is invalid or has expired")
  // has only its message to show.
  return Object.keys(error.errors).length === 0 ? error.message : null;
}