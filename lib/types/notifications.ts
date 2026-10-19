/** The notifications inbox: things that happened to the person that they may want to know about. */

import type { Paginated } from "@/lib/types/common";

/**
 * One notification. Named AppNotification because the browser already has its own global "Notification".
 *
 * `kind` says what happened, as "area.event". The ones the API sends today:
 *   order.paid, order.shipped, order.completed, order.cancelled, refund.started, refund.processed,
 *   dispute.opened, dispute.resolved, payout.paid, payout.failed, kyc.approved, kyc.rejected,
 *   review.received, review.replied, chat.started, listing.removed, listing.restored,
 *   account.suspended, account.reactivated, and for admins admin.dispute_opened, admin.kyc_submitted.
 * It is typed as plain text because new kinds will be added, and the screen must cope with one it has never heard of.
 */
export type AppNotification = {
  /** A long unique id (a UUID), not a number. */
  id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  /**
   * Where it leads, as a path on this site ("/orders/ORD-…", "/messages/12"), or null. Only ever follow it after
   * checking that it starts with a single "/" (see safeRedirectPath): it came from the server, but it is still text.
   */
  link: string | null;
  /** Extra ids the API attaches (order id, payout id, ...). Not for showing. */
  meta: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

/** A page of the inbox (20 to a page), plus how many are unread in all, across every page. */
export type NotificationPage = Paginated<AppNotification> & {
  unread_count: number;
};