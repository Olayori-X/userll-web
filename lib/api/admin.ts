/**
 * Everything the admin console asks the API. Every call needs an administrator with a verified email: anyone else
 * gets a 403. Every request an admin makes is recorded in the audit log, so reads of private things (an ID photo, a
 * conversation) are on record too.
 *
 * This file grows as each admin page is built.
 */

import { api } from "@/lib/api";
import type { Wrapped } from "@/lib/types/common";
import type { AdminOverview } from "@/lib/types/admin-overview";

const unwrap = <T>({ data }: Wrapped<T>) => data;

export type OverviewPeriod = {
  /** A date, "2026-10-01". Leave both out for the last 30 days. */
  from?: string;
  /** A date, "2026-10-31". Not before `from`. At most 366 days after it. */
  to?: string;
};

/**
 * The platform's numbers. The period only changes `sales` and `growth`: the "right now" sections (money held, what needs
 * attention, totals) always show the present. Field errors: `from` ("Choose a period of at most 366 days.").
 */
export function getOverview(period: OverviewPeriod = {}) {
  return api.get<Wrapped<AdminOverview>>("/admin/overview", { query: period }).then(unwrap);
}