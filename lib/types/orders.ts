/** The parts of the buyer's order screens that checkout did not already cover: disputes and reviews. */

/** Why a buyer reports a problem. The API accepts exactly these four. */
export type DisputeReason = "not_received" | "not_as_described" | "damaged" | "other";

/** What to send to report a problem with a shipped order. */
export type DisputeInput = {
  reason: DisputeReason;
  /** 10 to 2000 characters. */
  details: string;
};

/** What to send to review a completed order. */
export type ReviewInput = {
  /** A whole number, 1 to 5. */
  rating: number;
  /** Up to 1000 characters, or leave it out. */
  comment?: string;
};

/** The buyer's own review of an order. One per order, and it cannot be edited afterwards. */
export type OwnReview = {
  id: number;
  order_number: string | null;
  rating: number;
  comment: string | null;
  /** How the buyer's name is shown publicly, for example "Ada O." */
  reviewer: string;
  /** What the seller answered, once they do. */
  seller_reply: string | null;
  seller_replied_at: string | null;
  /** False when the seller has already replied, or an admin hid the review. Matters to the seller's screen, not the buyer's. */
  can_reply: boolean;
  /** An admin hid it from public lists. The buyer still sees it, along with why. */
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
};