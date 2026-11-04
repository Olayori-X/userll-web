/** The admin's side of disputes: the case itself, and the order's chat that an admin may read to decide it. */

import type { OrderStatus } from "@/lib/types/checkout";
import type { DisputeReason } from "@/lib/types/orders";

export type DisputeStatus = "open" | "resolved";

/** "release": the seller is paid. "refund": the buyer is refunded in full. */
export type DisputeResolution = "release" | "refund";

/** One dispute, with its order and the buyer who opened it. Amounts here are already formatted text. */
export type AdminDispute = {
  id: number;
  status: DisputeStatus;
  reason: DisputeReason;
  /** What the buyer wrote: 10 to 2000 characters, in their own words. Show it as plain text. */
  details: string;
  /** Null while the dispute is open. */
  resolution: DisputeResolution | null;
  /** What the admin wrote when deciding, shown to nobody but admins. Null if they left it empty or it is still open. */
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  /** The order in dispute. Present whenever the dispute is fetched on its own or in the list. */
  order?: {
    order_number: string;
    status: OrderStatus;
    /** What the buyer paid, ready to show: "₦25,000.00". */
    total_formatted: string;
    /** What the seller typed when they shipped it. */
    tracking_info: string | null;
    shipped_at: string | null;
    store_name: string | null;
    /** What was ordered. */
    items: { title: string; quantity: number; unit_price_formatted: string }[];
  };
  /** The buyer, who is always the one who opens a dispute. */
  opened_by?: {
    name: string;
    email: string;
  };
};

/** One message in the order's chat, as an admin reads it. */
export type ChatLine = {
  id: number;
  from: "buyer" | "seller";
  /** Plain text, up to 2000 characters. Show it as text: never as HTML. */
  body: string;
  sent_at: string;
  read: boolean;
};

/**
 * The buyer's and seller's chat about one order, read-only, newest 50 messages oldest first. Allowed only for an order
 * that has a dispute, and every read is recorded in the audit log.
 */
export type OrderChat = {
  order_number: string;
  dispute: { id: number; status: DisputeStatus; reason: DisputeReason };
  buyer: { id: number; name: string | null };
  seller: { id: number; name: string | null; store_name: string | null };
  messages: ChatLine[];
  /** True when there are earlier messages. Ask for them with ?before=<oldest message id>. */
  has_more: boolean;
};