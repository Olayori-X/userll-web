/** The admin's view of sellers' withdrawals. Read-only: a failed one is returned to the seller's balance by itself. */

import type { PayoutStatus } from "@/lib/types/wallet";

/** One withdrawal as an admin sees it. Amounts are KOBO. */
export type AdminPayout = {
  id: number;
  /**
   * "pending": reserved, about to be sent. "processing": the bank is receiving it. "paid": done. "failed" and
   * "reversed": it never arrived (or came back), and the money is back in the seller's available balance.
   */
  status: PayoutStatus;
  /** What left the seller's balance. */
  amount: number;
  /** The transfer cost, taken out of `amount`. */
  fee: number;
  /** What reaches the bank: amount minus fee. */
  net_amount: number;
  seller: {
    /** The seller's user id. */
    id: number;
    name: string | null;
    email: string | null;
    store_name: string | null;
  };
  bank_name: string | null;
  /** The name the BANK holds for the account. */
  account_name: string | null;
  /** "******6789", never the whole number. */
  account_number: string | null;
  /** Search this in the Paystack dashboard (its Transfers page) when something looks wrong. */
  paystack_reference: string | null;
  paystack_transfer_code: string | null;
  /**
   * Paystack's OWN wording for why a transfer failed. For admins only: sellers are shown a plain-language reason
   * the API writes itself. Show it as plain text.
   */
  failure_reason: string | null;
  requested_at: string;
  /** When it last changed. A withdrawal that has been "pending" or "processing" for a long time is the one to look at. */
  updated_at: string;
  /** When the bank received it. Null until then. */
  paid_at: string | null;
};