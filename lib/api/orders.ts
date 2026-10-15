/**
 * The buyer's orders: the list, one order, and the things a buyer can do to it.
 * Needs a login and a verified email. Only orders that have been paid for appear.
 *
 * Every action answers with the whole updated order, so the screen can replace what it has.
 * When an action is not allowed in the order's current state, the answer is a 422 with a `status` error
 * ("This order cannot be cancelled right now (status: shipped)."): show it, and reload the order,
 * because the order has most likely changed since the screen was loaded.
 */

import { api } from "@/lib/api";
import type { Wrapped, Paginated } from "@/lib/types/common";
import type { Order, OrderStatus } from "@/lib/types/checkout";
import type { DisputeInput, OwnReview, ReviewInput } from "@/lib/types/orders";

const unwrap = <T>({ data }: Wrapped<T>) => data;

const path = (orderNumber: string) => `/orders/${encodeURIComponent(orderNumber)}`;

export type OrderFilter = {
  /** Only orders in this state. Leave it out for all of them. */
  status?: OrderStatus;
  page?: number;
};

/** The buyer's orders, newest first, 20 to a page. */
export function getOrders(filter: OrderFilter = {}) {
  return api.get<Paginated<Order>>("/orders", { query: filter });
}

export function getOrder(orderNumber: string) {
  return api.get<Wrapped<Order>>(path(orderNumber)).then(unwrap);
}

/** "I received it." Releases the seller's money, so it cannot be undone. Allowed while shipped or delivered. */
export function confirmOrder(orderNumber: string) {
  return api.post<Wrapped<Order>>(`${path(orderNumber)}/confirm`).then(unwrap);
}

/** A change of mind before the seller ships: the whole amount is refunded. Only allowed while the order is "paid". */
export function cancelOrder(orderNumber: string) {
  return api.post<Wrapped<Order>>(`${path(orderNumber)}/cancel`).then(unwrap);
}

/**
 * "There is a problem." Freezes the order until an admin decides. Only possible while the order is "shipped".
 * Field errors: `reason`, `details` (10 to 2000 characters), and `status`.
 */
export function openDispute(orderNumber: string, input: DisputeInput) {
  return api.post<Wrapped<Order>>(`${path(orderNumber)}/dispute`, input).then(unwrap);
}

/** The buyer's review of this order, or null when they have not written one. */
export function getMyReview(orderNumber: string) {
  return api.get<{ data: OwnReview | null }>(`${path(orderNumber)}/review`).then(unwrap);
}

/**
 * Reviews a completed order. One per order, and it cannot be edited. Errors: `rating`, and `order`
 * ("You can review an order once it is completed." or "You have already reviewed this order.").
 */
export function createReview(orderNumber: string, input: ReviewInput) {
  return api.post<Wrapped<OwnReview>>(`${path(orderNumber)}/review`, input).then(unwrap);
}