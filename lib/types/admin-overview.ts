/** The numbers an operator watches. Every amount is KOBO. */

export type AdminOverview = {
  /** The period the `sales` and `growth` numbers cover. Timestamps ("2026-10-01T00:00:00+01:00"). */
  period: { from: string; to: string };

  /** What happened in the chosen period. */
  sales: {
    /** Orders paid for in the period. */
    paid_orders: number;
    paid_total: number;
    /** Orders whose money was released in the period (counted by their release date, not their payment date). */
    completed_orders: number;
    completed_total: number;
    /** Our commission on those completed orders: earned when the money is released, not when it is paid. */
    commission_earned: number;
    refunds_requested: number;
    refunds_requested_total: number;
  };

  growth: {
    new_users: number;
    new_sellers: number;
  };

  /**
   * The state of the platform right now, whatever period was chosen. Seller money and our own commission are kept
   * apart, so nothing of ours is counted as theirs.
   */
  money_now: {
    /** Everything buyers paid that has not yet been released. */
    escrow_held: number;
    /** ...of which sellers' money. */
    escrow_sellers_share: number;
    /** ...of which our commission. */
    escrow_commission: number;
    /** Released to sellers, waiting for them to withdraw it. */
    owed_to_sellers: number;
    /** Our commission, released and ours, over all time. */
    commission_earned_all_time: number;
    payouts_in_progress_count: number;
    payouts_in_progress_total: number;
  };

  /** Things that are waiting for a person. Each links to its queue. */
  needs_attention: {
    open_disputes: number;
    pending_kyc: number;
    /** Refunds that failed, or that the payment provider flagged for a person to look at. */
    failed_refunds: number;
    /** Payments where the buyer paid but the order could not go ahead (for example, it sold out): they need a refund. */
    payments_needing_refund: number;
    payouts_returned_last_7_days: number;
  };

  totals: {
    users: number;
    suspended_users: number;
    sellers: number;
    verified_sellers: number;
    /** Live, in stock, and the seller is not suspended. */
    buyable_listings: number;
  };
};