/** The admin's side of payments (what buyers paid) and refunds (money going back to them). */

/**
 * "pending": started, nothing received. "paid": confirmed. "failed": the payment didn't go through.
 * "needs_refund": the buyer PAID but couldn't get an order, so the money must go back. "refunded": a refund was issued.
 */
export type PaymentStatus = "pending" | "paid" | "failed" | "needs_refund" | "refunded";

/**
 * Why a payment needs a refund, as the API names it. Typed as plain text because the "checkout_<status>" ones vary and new
 * ones may be added: the screen must cope with a flag it has never heard of.
 *   out_of_stock, amount_mismatch, orders_not_pending, checkout_cancelled, checkout_expired, checkout_paid, ...
 */
export type PaymentFlag = string;

export type AdminPayment = {
  id: number;
  /** Paystack's reference for this payment ("PAY-…"): what to search for in the Paystack dashboard. */
  reference: string;
  /** The checkout it belongs to ("CHK-…"). */
  checkout_reference: string | null;
  /** Kobo. */
  amount: number;
  /** Ready to show: "₦25,000.00". */
  amount_formatted: string;
  status: PaymentStatus;
  /** Why it needs a refund. Null for payments that don't. */
  flag: PaymentFlag | null;
  created_at: string;
};

/**
 * "pending": created, not yet accepted by Paystack. "processing": Paystack has it. "processed": done, though the bank
 * can take a few days. "failed": needs an admin: check Paystack, then retry. "needs_attention": Paystack needs the
 * buyer's bank details, which only the buyer's bank or Paystack can sort out.
 */
export type RefundStatus = "pending" | "processing" | "processed" | "failed" | "needs_attention";

/** One refund: money going back to a buyer. */
export type AdminRefund = {
  id: number;
  status: RefundStatus;
  /**
   * Why: "manual_refund" (an admin refunded a payment), "dispute_refund", and the ones made when an order is cancelled.
   * Plain text: new reasons may appear.
   */
  reason: string;
  /** Kobo. */
  amount: number;
  amount_formatted: string;
  /** The payment it comes out of ("PAY-…"). */
  payment_reference: string | null;
  /** The order it is for. Null for a refund of a whole payment that never became an order. */
  order_number: string | null;
  /** Paystack's id for it, once Paystack has it. Null before. */
  paystack_refund_id: string | null;
  /** The API's plain-language reason a refund failed. Null otherwise. */
  failure_note: string | null;
  created_at: string;
};