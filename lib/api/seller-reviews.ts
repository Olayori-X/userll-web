/**
 * Reviews of the seller's shop, and replying to them. Needs a seller (a shop, a verified email).
 *
 * A review can be replied to once. The reply is public and cannot be edited afterwards.
 */

import { api } from "@/lib/api";
import type { Wrapped } from "@/lib/types/common";
import type { OwnReview } from "@/lib/types/orders";
import type { SellerReviewPage } from "@/lib/types/reviews";

export type SellerReviewFilter = {
  /** Only the reviews still waiting for a reply (and not hidden). */
  needsReply?: boolean;
  page?: number;
};

/** The shop's reviews, newest first, 20 to a page, with the shop's totals. */
export function getSellerReviews({ needsReply = false, page = 1 }: SellerReviewFilter = {}) {
  return api.get<SellerReviewPage>("/seller/reviews", {
    query: { needs_reply: needsReply || undefined, page: page > 1 ? page : undefined },
  });
}

/**
 * Posts the one public reply to a review, 2 to 500 characters. Field errors: `reply`, and `review`
 * ("You have already replied to this review." or "This review is hidden and cannot be replied to.").
 * Answers with the review as it now is.
 */
export function replyToReview(reviewId: number, reply: string) {
  return api.post<Wrapped<OwnReview>>(`/seller/reviews/${reviewId}/reply`, { reply }).then(({ data }) => data);
}