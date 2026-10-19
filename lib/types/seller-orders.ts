/** An order as the SELLER sees it: what to ship, where, and what they earn. */

import type { OrderItem, OrderStatus, ShippingAddress } from "@/lib/types/checkout";

/**
 * Same order number, status and amounts as the buyer's order, but with the seller's money and the delivery
 * details. Notice that it has no `seller` (the seller is the one looking) and no buyer account, only the
 * delivery name and address, which is all they need to ship it. All amounts are kobo.
 */
export type SellerOrder = {
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  subtotal_formatted: string;
  delivery_fee: number;
  delivery_fee_formatted: string;
  /** What the buyer paid. */
  total: number;
  total_formatted: string;
  /** What the platform keeps, in kobo. */
  commission: number;
  commission_formatted: string;
  /** The commission rate in basis points: 500 means 5%. Fixed when the order was placed, so later changes never touch it. */
  commission_rate_bps: number;
  /** What the seller gets: total minus commission. Held until the buyer confirms, then available to withdraw. */
  earnings: number;
  earnings_formatted: string;
  /** Where to send it. The API calls this `ship_to`, but it has the same shape as a buyer's `shipping`. */
  ship_to: ShippingAddress;
  /** What the seller typed when they shipped it: courier and tracking number, in their own words. */
  tracking_info: string | null;
  /** Timestamps ("2026-03-14T09:30:00+00:00"), or null until it happens. */
  created_at: string;
  paid_at: string | null;
  /** The deadline to ship. If it passes, the order is cancelled and the buyer is refunded. */
  ship_by_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};