/**
 * How an order's status looks to the buyer, and what the buyer can do about it.
 *
 * Pure code, no React. The API sends no "what can I do" flags, so the rules below are the same ones the API
 * enforces. The API still checks every action again, so a mistake here shows a wrong button, never a wrong result.
 */

import type { Order, OrderStatus } from "@/lib/types/checkout";
import { daysUntil, formatDay } from "@/lib/dates";
import type { SellerOrder } from "@/lib/types/seller-orders";

export type StatusTone = "info" | "success" | "warning" | "danger" | "neutral";

export type StatusInfo = {
  /** Short, for the badge. */
  label: string;
  tone: StatusTone;
  /** One sentence to the buyer about what this means for them. */
  hint: string;
};

export const ORDER_STATUS: Record<OrderStatus, StatusInfo> = {
  pending_payment: { label: "Awaiting payment", tone: "warning", hint: "We're waiting for your payment." },
  paid: { label: "Paid", tone: "info", hint: "The seller is getting your order ready to ship." },
  shipped: { label: "Shipped", tone: "info", hint: "It's on its way. Confirm once it arrives." },
  delivered: { label: "Delivered", tone: "success", hint: "It has arrived." },
  completed: { label: "Completed", tone: "success", hint: "All done. The seller has been paid." },
  cancelled: { label: "Cancelled", tone: "neutral", hint: "This order was cancelled." },
  refunded: { label: "Refunded", tone: "neutral", hint: "You were refunded in full. It can take a few days to show in your account." },
  disputed: {
    label: "Problem reported",
    tone: "danger",
    hint: "We're looking into it. The seller isn't paid until it's decided.",
  },
};

export type OrderActions = {
  /** A change of mind, for a full refund. Only before the seller ships. */
  canCancel: boolean;
  /** "I received it": releases the seller's money. */
  canConfirm: boolean;
  /** Freezes the order for an admin to decide. Only while it is shipped and not yet confirmed. */
  canReportProblem: boolean;
  /** Rate the seller. Only once the order is completed. */
  canReview: boolean;
};

export function orderActions(order: Pick<Order, "status">): OrderActions {
  const { status } = order;

  return {
    canCancel: status === "paid",
    canConfirm: status === "shipped" || status === "delivered",
    canReportProblem: status === "shipped",
    canReview: status === "completed",
  };
}

export type StepState = "done" | "current" | "upcoming";

export type OrderStep = {
  label: string;
  state: StepState;
};

const STEP_LABELS = ["Paid", "Shipped", "Completed"] as const;

/** How many of the three steps an order has reached. Orders that left the normal path have no entry. */
const REACHED: Partial<Record<OrderStatus, number>> = {
  pending_payment: 0,
  paid: 1,
  shipped: 2,
  delivered: 2,
  disputed: 2, // it was shipped, and the last step waits for an admin's decision
  completed: 3,
};

/**
 * The progress bar: Paid, Shipped, Completed. Each step is done, current (what the order is waiting for)
 * or upcoming. Cancelled and refunded orders never finished, so they get no progress bar at all (null).
 */
export function orderSteps(status: OrderStatus): OrderStep[] | null {
  const reached = REACHED[status];

  if (reached === undefined) return null;

  return STEP_LABELS.map((label, index) => ({
    label,
    state: index < reached ? "done" : index === reached ? "current" : "upcoming",
  }));
}

/** Who is looking at the order. The same status means different things to each. */
export type OrderViewer = "buyer" | "seller";

/** The seller's words for each status: what it means for THEM, and what to do. */
export const SELLER_ORDER_STATUS: Record<OrderStatus, StatusInfo> = {
  pending_payment: { label: "Awaiting payment", tone: "warning", hint: "The buyer hasn't paid yet." },
  paid: { label: "To ship", tone: "warning", hint: "Ship it before the deadline, then add the tracking details." },
  shipped: { label: "On its way", tone: "info", hint: "Waiting for the buyer to confirm. If they don't, you're paid automatically." },
  delivered: { label: "Delivered", tone: "success", hint: "It has arrived." },
  completed: { label: "Completed", tone: "success", hint: "Done. The money is in your wallet." },
  cancelled: { label: "Cancelled", tone: "neutral", hint: "This order was cancelled. Nothing is owed to you." },
  refunded: { label: "Refunded", tone: "neutral", hint: "The buyer was refunded. Nothing is owed to you." },
  disputed: {
    label: "Problem reported",
    tone: "danger",
    hint: "The buyer reported a problem. We'll look into it and tell you the outcome. Your payment is on hold.",
  },
};

/** The status words for whoever is looking: the buyer's or the seller's. */
export function statusInfo(status: OrderStatus, viewer: OrderViewer = "buyer"): StatusInfo | undefined {
  return (viewer === "seller" ? SELLER_ORDER_STATUS : ORDER_STATUS)[status];
}

export type SellerOrderActions = {
  /** "I've handed it over", with tracking details. Only while the order is paid. */
  canShip: boolean;
  /** "I can't fulfil this": the buyer is refunded in full. Only before shipping. */
  canCancel: boolean;
};

/** What a seller can do about an order. After shipping, it is up to the buyer, an admin, or the automatic release. */
export function sellerOrderActions(order: Pick<Order, "status">): SellerOrderActions {
  return { canShip: order.status === "paid", canCancel: order.status === "paid" };
}

export type ShipDeadline = {
  /** The deadline in plain words. */
  text: string;
  /** True when it is close or has passed, so the screen can make it stand out. */
  urgent: boolean;
};

/**
 * For an order waiting to be shipped: how long the seller has, in plain words. Null for any other order.
 * If the deadline passes, the API cancels the order and refunds the buyer, so it is the date that matters most to a seller.
 */
export function shipDeadline(order: Pick<SellerOrder, "status" | "ship_by_at">): ShipDeadline | null {
  if (order.status !== "paid") return null;

  const days = daysUntil(order.ship_by_at);
  const day = formatDay(order.ship_by_at);

  if (days === null || !day) return { text: "Ship it as soon as you can", urgent: false };

  // daysUntil rounds up, so 0 or less means the moment has passed and 1 means "within the next 24 hours".
  if (days <= 0) return { text: `Deadline passed (${day}). It may be cancelled and refunded any moment.`, urgent: true };
  if (days === 1) return { text: `Ship within a day (by ${day})`, urgent: true };
  if (days === 2) return { text: `Ship by ${day} (2 days left)`, urgent: true };

  return { text: `Ship by ${day} (${days} days left)`, urgent: false };
}