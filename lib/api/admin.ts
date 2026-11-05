/**
 * Everything the admin console asks the API. Every call needs an administrator with a verified email: anyone else
 * gets a 403. Every request an admin makes is recorded in the audit log, so reads of private things (an ID photo, a
 * conversation) are on record too.
 *
 * This file grows as each admin page is built.
 */

import { api } from "@/lib/api";
import type { Paginated, Wrapped } from "@/lib/types/common";
import type { AdminOverview } from "@/lib/types/admin-overview";
import type { AdminKycSubmission } from "@/lib/types/admin-kyc";
import type { KycStatus } from "@/lib/types/seller";
import type { AdminDispute, DisputeResolution, DisputeStatus, OrderChat } from "@/lib/types/admin-disputes";
import type { AdminPayment, AdminRefund, PaymentStatus, RefundStatus } from "@/lib/types/admin-payments";
import type { AdminPayout } from "@/lib/types/admin-payouts";
import type { PayoutStatus } from "@/lib/types/wallet";

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

// ---------------------------------------------------------------- identity checks

export type KycFilter = {
  /** "pending" by default, which the API lists oldest first so nobody waits forever. The others are newest first. */
  status?: KycStatus;
  page?: number;
};

/** Identity checks by status, 30 to a page. Items have no `name_match`: that comes with a single submission. */
export function getKycSubmissions({ status, page = 1 }: KycFilter = {}) {
  return api.get<Paginated<AdminKycSubmission>>("/admin/kyc", { query: { status, page: page > 1 ? page : undefined } });
}

/** One submission, with `name_match`: how well the name on the ID fits the name the seller's bank holds. */
export function getKycSubmission(id: number) {
  return api.get<Wrapped<AdminKycSubmission>>(`/admin/kyc/${id}`).then(unwrap);
}

/**
 * Where to show the ID photo from, through our own proxy (which adds the admin's login, so a plain <img> works).
 * The photo is private and never cached, and every look at it is recorded in the audit log.
 */
export function kycPhotoUrl(id: number): string {
  return `/api/admin/kyc/${id}/photo`;
}

/** Verifies the seller. They are told, and can withdraw once their bank account is set up too. */
export function approveKyc(id: number) {
  return api.post<Wrapped<AdminKycSubmission>>(`/admin/kyc/${id}/approve`).then(unwrap);
}

/**
 * Turns it down. The reason is what the SELLER reads, 5 to 255 characters (error field `reason`), so it must say what to fix.
 * A decision cannot be taken twice: if someone already decided (another admin, another tab), the answer is a 422 with a `status` error.
 */
export function rejectKyc(id: number, reason: string) {
  return api.post<Wrapped<AdminKycSubmission>>(`/admin/kyc/${id}/reject`, { reason }).then(unwrap);
}

// ---------------------------------------------------------------- disputes

export type DisputeFilter = {
  /** "open" by default, which the API lists oldest first so nobody waits forever. Resolved ones are listed the same way. */
  status?: DisputeStatus;
  page?: number;
};

/** Disputes by status, 30 to a page, each with its order, what was ordered and who opened it. */
export function getDisputes({ status, page = 1 }: DisputeFilter = {}) {
  return api.get<Paginated<AdminDispute>>("/admin/disputes", { query: { status, page: page > 1 ? page : undefined } });
}

/** One dispute, open or resolved. The notification for admins links to its page. */
export function getDispute(id: number) {
  return api.get<Wrapped<AdminDispute>>(`/admin/disputes/${id}`).then(unwrap);
}

/**
 * The buyer's and seller's chat about the order in dispute, read-only, the newest 50 messages (pass the oldest message's id
 * as `before` for earlier ones). Every read is recorded in the audit log. A 403 means the order has no dispute, and a 404
 * means the two never messaged: both are normal, not failures.
 */
export function getOrderChat(orderNumber: string, before?: number) {
  return api.get<Wrapped<OrderChat>>(`/admin/orders/${encodeURIComponent(orderNumber)}/chat`, { query: { before } }).then(unwrap);
}

/**
 * Decides a dispute, once and for good. "release" pays the seller (the order completes, the commission is taken);
 * "refund" refunds the buyer in full, with no automatic restock because the goods were shipped. The note (up to 1000
 * characters) is for the admins' own record. Deciding twice gives a 422 with a `dispute` error.
 */
export function resolveDispute(id: number, resolution: DisputeResolution, note?: string) {
  return api
    .post<Wrapped<AdminDispute>>(`/admin/disputes/${id}/resolve`, { resolution, ...(note ? { note } : {}) })
    .then(unwrap);
}

// ---------------------------------------------------------------- payments and refunds

export type PaymentFilter = {
  /** "needs_refund" by default: the payments where a buyer paid but couldn't get an order. */
  status?: PaymentStatus;
  page?: number;
};

/** Payments by status, newest first, 30 to a page. */
export function getPayments({ status, page = 1 }: PaymentFilter = {}) {
  return api.get<Paginated<AdminPayment>>("/admin/payments", { query: { status, page: page > 1 ? page : undefined } });
}

/**
 * Sends a "needs_refund" payment back to the buyer, in full. The payment becomes "refunded", a refund is created and
 * sent to Paystack by the queue worker, and the buyer is told why they have no order and what happens next.
 * Only a payment marked needs_refund can be refunded: anything else gives a 422 with a `payment` error.
 * It moves real money and is never repeated automatically.
 */
export function refundPayment(id: number) {
  return api.post<Wrapped<AdminRefund>>(`/admin/payments/${id}/refund`).then(unwrap);
}

export type RefundFilter = {
  /** Leave it out for every refund. */
  status?: RefundStatus;
  page?: number;
};

/** Refunds, newest first, 30 to a page. */
export function getRefunds({ status, page = 1 }: RefundFilter = {}) {
  return api.get<Paginated<AdminRefund>>("/admin/refunds", { query: { status, page: page > 1 ? page : undefined } });
}

/**
 * Sends a FAILED refund again. Check the Paystack dashboard first: if the money already went back, retrying refunds the
 * buyer twice. Only a failed refund can be retried: anything else gives a 422 with a `refund` error.
 */
export function retryRefund(id: number) {
  return api.post<Wrapped<AdminRefund>>(`/admin/refunds/${id}/retry`).then(unwrap);
}

// ---------------------------------------------------------------- payouts (read-only)

export type AdminPayoutFilter = {
  /** Leave it out for every withdrawal. */
  status?: PayoutStatus;
  /** Only one seller's withdrawals: their user id. */
  sellerId?: number;
  /** A Paystack reference or transfer code, matched exactly. How to find the transfer a seller is asking about. */
  reference?: string;
  page?: number;
};

/** Sellers' withdrawals, newest first, 30 to a page. Read-only: nothing an admin does here changes one. */
export function getAdminPayouts({ status, sellerId, reference, page = 1 }: AdminPayoutFilter = {}) {
  return api.get<Paginated<AdminPayout>>("/admin/payouts", {
    query: { status, seller_id: sellerId, reference, page: page > 1 ? page : undefined },
  });
}

export function getAdminPayout(id: number) {
  return api.get<Wrapped<AdminPayout>>(`/admin/payouts/${id}`).then(unwrap);
}