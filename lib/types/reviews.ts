/** A seller's public reviews, as shown on their shop page. */

import type { Paginated } from "@/lib/types/common";

/** One visible review. Reviews an admin hid never appear here. */
export type PublicReview = {
  id: number;
  /** A whole number, 1 to 5. */
  rating: number;
  comment: string | null;
  /** The reviewer's name as shown publicly, first name and an initial: "Ada O." */
  reviewer: string;
  /** What the seller answered, once they do. */
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
};

export type StarRating = 1 | 2 | 3 | 4 | 5;

/** The numbers for the rating chart on a shop page. */
export type ReviewSummary = {
  reviews_count: number;
  /** 0 when there are no reviews yet. Check reviews_count before showing stars. */
  rating_average: number;
  /** How many visible reviews gave each number of stars: { 5: 12, 4: 3, 3: 0, 2: 0, 1: 1 }. */
  distribution: Record<StarRating, number>;
};

/** A page of reviews (20 to a page), with the summary for the whole shop, not just this page. */
export type ReviewPage = Paginated<PublicReview> & {
  summary: ReviewSummary;
};