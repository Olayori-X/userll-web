/** The admin's side of reviews: finding them, hiding the ones that break the rules, and un-hiding them. */

/** One review as an admin sees it: the whole thing, including who wrote it and who it is about. */
export type AdminReview = {
  id: number;
  /** A whole number, 1 to 5. */
  rating: number;
  /** What the buyer wrote. Show it as plain text. */
  comment: string | null;
  seller_reply: string | null;
  seller_replied_at: string | null;
  /** The order it is about. */
  order_number: string | null;
  /** The buyer who wrote it. */
  reviewer: {
    id: number;
    name: string | null;
    email: string | null;
  };
  seller: {
    /** The seller's user id. */
    id: number;
    name: string | null;
    store_name: string | null;
  };
  /** A hidden review is out of public lists and out of the seller's average. */
  is_hidden: boolean;
  /** Why it was hidden. The buyer and the seller are SHOWN this, so it says what was wrong. Null unless hidden. */
  hidden_reason: string | null;
  /** The name of the admin who hid it. */
  hidden_by: string | null;
  hidden_at: string | null;
  created_at: string;
};