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

/** A Lagos calendar day as text that sorts and compares: "2026-03-14". */
function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TIME_ZONE }).format(date);
}

/**
 * For lists of messages: "9:30 am" for today, "Mon" for the last week, otherwise "14 Mar"
 * (with the year when it was not this year). Null when there is no usable date.
 */
export function formatMessageTime(timestamp: string | null | undefined): string | null {
  const date = parse(timestamp);
  if (!date) return null;

  const now = new Date();
  const thisDay = dayKey(date);
  const today = dayKey(now);

  if (thisDay === today) {
    return new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE }).format(date);
  }

  // Both are plain dates, so the difference is a whole number of days.
  const daysAgo = Math.round((Date.parse(today) - Date.parse(thisDay)) / 86_400_000);

  if (daysAgo >= 1 && daysAgo < 7) {
    return new Intl.DateTimeFormat("en-NG", { weekday: "short", timeZone: TIME_ZONE }).format(date);
  }

  const sameYear = thisDay.slice(0, 4) === today.slice(0, 4);

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: TIME_ZONE,
  }).format(date);
}

/** The heading between days in a conversation: "Today", "Yesterday", or "14 Mar 2026". Null when there is no usable date. */
export function formatDayLabel(timestamp: string | null | undefined): string | null {
  const date = parse(timestamp);
  if (!date) return null;

  const daysAgo = Math.round((Date.parse(dayKey(new Date())) - Date.parse(dayKey(date))) / 86_400_000);

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";

  return formatDay(timestamp);
}

/** "9:30 am": just the time of day, for messages under a day heading. Null when there is no usable date. */
export function formatClock(timestamp: string | null | undefined): string | null {
  const date = parse(timestamp);

  return date ? new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE }).format(date) : null;
}