/** The seller's wallet: what they can withdraw, what is held, why they may not withdraw yet, and their withdrawals. */

import type { PayoutAccount } from "@/lib/types/seller";

/**
 * "pending": the amount is reserved and about to be sent. "processing": the bank is receiving it.
 * "paid": done. "failed" and "reversed": it never arrived (or came back), and the money is back in the available balance.
 */
export type PayoutStatus = "pending" | "processing" | "paid" | "failed" | "reversed";

/** One withdrawal. All amounts are kobo. */
export type Payout = {
  id: number;
  /** What left the seller's balance. */
  amount: number;
  /** The transfer cost, taken out of `amount`. */
  fee: number;
  /** What reaches the bank: amount minus fee. */
  net_amount: number;
  status: PayoutStatus;
  bank_name: string | null;
  account_name: string | null;
  /** "******6789", or null. */
  account_number: string | null;
  /** A plain sentence for failed and reversed withdrawals. The API's own wording, never the payment provider's. */
  message: string | null;
  requested_at: string;
  /** When the bank received it. Null until then. */
  paid_at: string | null;
};

/**
 * Why a withdrawal is not possible right now. `code` is stable and safe to act on; `message` is a ready
 * sentence for the seller.
 *   kyc: identity not verified. payout_account: no verified bank account. account_hold: the account is new or
 *   changed (see `until`). payout_in_progress: one is already on its way. balance_too_low: below the minimum.
 */
export type WalletBlocker = {
  code: "kyc" | "payout_account" | "account_hold" | "payout_in_progress" | "balance_too_low";
  message: string;
  /** For account_hold only: when withdrawals open up again. */
  until?: string;
};

export type WalletSummary = {
  /** Kobo that can be withdrawn now. */
  available_balance: number;
  /** Kobo held until buyers confirm their orders. */
  pending_balance: number;
  /** The smallest withdrawal, in kobo. */
  min_payout: number;
  /** True only when `blockers` is empty. */
  can_withdraw: boolean;
  blockers: WalletBlocker[];
  payout_account: PayoutAccount | null;
  /** A withdrawal that is still on its way, or null. */
  open_payout: Payout | null;
};

/** What a withdrawal of a given amount would cost. All kobo. */
export type PayoutQuote = {
  amount: number;
  fee: number;
  /** What would reach the bank. */
  net: number;
  min_payout: number;
};