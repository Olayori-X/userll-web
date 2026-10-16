/**
 * Showing the API's timestamps ("2026-03-14T09:30:00+00:00") to people in Nigeria.
 *
 * Always in Lagos time, whatever the visitor's device says, so everyone reads the same day for the same
 * moment, and so a "ship by" date means one day for the buyer and the seller alike.
 */

const TIME_ZONE = "Africa/Lagos";

function parse(timestamp: string | null | undefined): Date | null {
  if (!timestamp) return null;

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14 Mar 2026", or null when there is no usable date. */
export function formatDay(timestamp: string | null | undefined): string | null {
  const date = parse(timestamp);

  return date ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: TIME_ZONE }).format(date) : null;
}

/** "14 Mar 2026, 9:30 am", or null when there is no usable date. */
export function formatDateTime(timestamp: string | null | undefined): string | null {
  const date = parse(timestamp);

  return date
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE }).format(date)
    : null;
}

/**
 * How many days from now until a moment, rounded up: 3 means "within 3 days", 1 means "within a day",
 * 0 or less means it has passed. Null when there is no usable date.
 */
export function daysUntil(timestamp: string | null | undefined): number | null {
  const date = parse(timestamp);

  return date ? Math.ceil((date.getTime() - Date.now()) / 86_400_000) : null;
}