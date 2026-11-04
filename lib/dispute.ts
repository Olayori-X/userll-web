/** Words and small rules shared by the admin's dispute screens. Pure code, no React. */

import type { DisputeResolution } from "@/lib/types/admin-disputes";
import type { DisputeReason } from "@/lib/types/orders";

/** Why the buyer reported a problem, in the third person: for the admin reading it. */
export const DISPUTE_REASON_LABEL: Record<DisputeReason, string> = {
  not_received: "Not received",
  not_as_described: "Not as described",
  damaged: "Arrived damaged",
  other: "Something else",
};

/** What each way of deciding means, as the admin should understand it before choosing. */
export const RESOLUTION_INFO: Record<DisputeResolution, { label: string; effect: string }> = {
  release: {
    label: "Pay the seller",
    effect: "The order is completed and the seller is paid their earnings, with our commission taken.",
  },
  refund: {
    label: "Refund the buyer",
    effect: "The buyer is refunded in full. The items are not put back on sale, because they were already shipped.",
  },
};

/** A dispute open longer than this is flagged: a seller's money is frozen until someone decides. */
export const SLOW_DISPUTE_HOURS = 72;

/** Whole hours since a moment, or null when there is no usable date. */
export function hoursSince(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;

  const time = new Date(timestamp).getTime();

  return Number.isNaN(time) ? null : (Date.now() - time) / 3_600_000;
}