/** Addresses, checkouts and orders, as the API returns them. All amounts are kobo, with `_formatted` texts ready to show. */

import type { SellerSummary } from "@/lib/types/catalog";

/** A saved delivery address. */
export type Address = {
  id: number;
  label: string | null;
  recipient_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  is_default: boolean;
};

/** What to send to save a new address. */
export type NewAddress = {
  label?: string;
  recipient_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  is_default?: boolean;
};

/** "pending" until paid. "cancelled" when replaced by a newer checkout or when something sold out before payment landed. */
export type CheckoutStatus = "pending" | "paid" | "cancelled" | "expired";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded"
  | "disputed";

export type OrderItem = {
  title: string;
  quantity: number;
  unit_price: number;
  unit_price_formatted: string;
  line_total: number;
  line_total_formatted: string;
};

/** The delivery address as it was when the order was placed. Later edits to the saved address never change it. */
export type ShippingAddress = {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
};

/** One seller's part of a purchase. */
export type Order = {
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  subtotal_formatted: string;
  delivery_fee: number;
  delivery_fee_formatted: string;
  total: number;
  total_formatted: string;
  /** Only present when the API loaded it (checkouts and order pages do). */
  seller?: SellerSummary | null;
  shipping: ShippingAddress;
  /** What the seller typed when shipping: courier and tracking number, in their own words. */
  tracking_info: string | null;
  /** Timestamps: "2026-03-14T09:30:00+00:00", or null until it happens. */
  created_at: string;
  paid_at: string | null;
  ship_by_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  auto_release_at: string | null;
};

/** One payment covering one order per seller in the cart. */
export type Checkout = {
  /** "CHK-…". Identifies the checkout in addresses and in every call about it. */
  reference: string;
  status: CheckoutStatus;
  total: number;
  total_formatted: string;
  orders: Order[];
  created_at: string;
};

/** What starting a payment returns. Send the buyer to authorization_url: that is Paystack's own payment page. */
export type PaymentStart = {
  authorization_url: string;
  access_code: string;
  /** This payment attempt's reference ("PAY-…"). A checkout can have several attempts. */
  reference: string;
};