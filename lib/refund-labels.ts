/** Plain-language words for the admin's payment and refund screens. Pure code, no React. */

import type { PaymentFlag, RefundStatus } from "@/lib/types/admin-payments";

export type FlagInfo = {
  /** Short, for a list row. */
  label: string;
  /** What happened, and what the admin should do about it. */
  explain: string;
  /** True when the admin should check Paystack BEFORE refunding, because the amount is in question. */
  checkFirst?: boolean;
};

const KNOWN: Record<string, FlagInfo> = {
  out_of_stock: {
    label: "Sold out",
    explain: "An item sold out before the payment arrived, so there was nothing to ship. Refund the buyer.",
  },
  amount_mismatch: {
    label: "Wrong amount",
    explain:
      "Paystack reported a different amount from the checkout's total. Open the payment in the Paystack dashboard and confirm how much actually arrived before you refund.",
    checkFirst: true,
  },
  orders_not_pending: {
    label: "Orders already handled",
    explain: "The orders were no longer waiting for payment when it arrived. Refund the buyer.",
  },
  checkout_cancelled: {
    label: "Checkout replaced",
    explain: "The buyer started a newer checkout, which cancelled this one, and paid it anyway. Refund the buyer unless they were meant to keep this one.",
  },
  checkout_expired: {
    label: "Checkout expired",
    explain: "The payment arrived after the checkout expired. Refund the buyer.",
  },
  checkout_paid: {
    label: "Paid twice",
    explain: "This checkout was already paid by another payment, so this one is a duplicate. Refund the buyer.",
  },
};

/** Words for why a payment needs a refund. A flag the screen has never heard of still gets readable words. */
export function flagInfo(flag: PaymentFlag | null): FlagInfo {
  if (!flag) return { label: "Needs a refund", explain: "The buyer paid, but couldn't get an order. Refund the buyer." };

  return (
    KNOWN[flag] ?? {
      label: flag.replace(/_/g, " "),
      explain: "The buyer paid, but couldn't get an order. Check the details before refunding.",
    }
  );
}

/** What a refund's reason means, for the refunds list. */
const REASONS: Record<string, string> = {
  manual_refund: "Refunded by an admin",
  dispute_refund: "A dispute was decided for the buyer",
  buyer_cancelled: "The buyer cancelled",
  seller_cancelled: "The seller cancelled",
  overdue_shipping: "The seller didn't ship in time",
};

export function refundReason(reason: string): string {
  return REASONS[reason] ?? reason.replace(/_/g, " ");
}

export type RefundStatusInfo = {
  label: string;
  tone: "info" | "success" | "danger" | "warning";
  /** What it means, and who can do something about it. */
  hint: string;
};

export const REFUND_STATUS: Record<RefundStatus, RefundStatusInfo> = {
  pending: { label: "About to send", tone: "info", hint: "Created, and about to be sent to Paystack." },
  processing: { label: "With Paystack", tone: "info", hint: "Paystack has it and is sending it back." },
  processed: { label: "Done", tone: "success", hint: "Sent back. The buyer's bank can take a few days to show it." },
  failed: {
    label: "Failed",
    tone: "danger",
    hint: "It didn't go through. Check the Paystack dashboard first, then retry. Retrying without checking can refund the buyer twice.",
  },
  needs_attention: {
    label: "Needs the buyer's bank details",
    tone: "warning",
    hint: "Paystack needs the buyer's bank details to finish this. Only Paystack and the buyer's bank can sort that out: contact Paystack support with the payment reference.",
  },
};