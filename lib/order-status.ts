/**
 * How an order's status looks to the buyer, and what the buyer can do about it.
 *
 * Pure code, no React. The API sends no "what can I do" flags, so the rules below are the same ones the API
 * enforces. The API still checks every action again, so a mistake here shows a wrong button, never a wrong result.
 */

import type { Order, OrderStatus } from "@/lib/types/checkout";

export type StatusTone = "info" | "success" | "warning" | "danger" | "neutral";

type StatusInfo = {
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