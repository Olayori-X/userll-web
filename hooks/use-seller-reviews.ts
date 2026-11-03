"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsSeller } from "@/hooks/use-seller";
import { getSellerReviews, replyToReview, type SellerReviewFilter } from "@/lib/api/seller-reviews";
import type { SellerReviewPage } from "@/lib/types/reviews";

/** Everything about the seller's reviews lives under ["seller", "reviews", ...], so logging out wipes it all. */
const REVIEWS_KEY = ["seller", "reviews"] as const;

/** New reviews show up on their own: the list is asked again every minute while the tab is in view. */
const POLL_MS = 60_000;

/** One page of the shop's reviews. While the next page or filter loads, the old results stay on screen. */
export function useSellerReviews(filter: SellerReviewFilter = {}) {
  return useQuery({
    queryKey: [...REVIEWS_KEY, "list", filter],
    queryFn: () => getSellerReviews(filter),
    enabled: useIsSeller(),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
}

/**
 * Posts the one reply to a review. The API answers with the review as it now is, and that goes straight into every
 * cached page, so the reply shows at once and the "Reply" box goes away. If the review turns out to be hidden or
 * already replied to (another tab, an admin), the lists are fetched again so the screen shows what is really true.
 *
 * Never repeated automatically: a reply is public and cannot be edited.
 */
export function useReplyToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: number; reply: string }) => replyToReview(reviewId, reply),

    onSuccess: (review) => {
      queryClient.setQueriesData<SellerReviewPage>({ queryKey: [...REVIEWS_KEY, "list"] }, (page) =>
        page ? { ...page, data: page.data.map((item) => (item.id === review.id ? review : item)) } : page,
      );

      // A "needs a reply" tab no longer holds this review, so those pages need a fresh look.
      void queryClient.invalidateQueries({ queryKey: [...REVIEWS_KEY, "list"] });
    },

    onError: () => {
      void queryClient.invalidateQueries({ queryKey: [...REVIEWS_KEY, "list"] });
    },
  });
}