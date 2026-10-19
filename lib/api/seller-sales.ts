/**
 * The money and the orders on the seller's side: the wallet, withdrawals, and the orders to ship.
 * Needs a seller (a shop, a verified email). All amounts are kobo.
 *
 * Every action on an order answers with the whole updated order. When an action is not allowed in the order's
 * current state (the buyer cancelled a second ago), the answer is a 422 with a `status` error: show it and reload the order.
 */

import { api } from "@/lib/api";
import type { OrderStatus } from "@/lib/types/checkout";
import type { Paginated, Wrapped } from "@/lib/types/common";
import type { SellerOrder } from "@/lib/types/seller-orders";
import type { Payout, PayoutQuote, WalletSummary } from "@/lib/types/wallet";

const unwrap = <T>({ data }: Wrapped<T>) => data;

const orderPath = (orderNumber: string) => `/seller/orders/${encodeURIComponent(orderNumber)}`;

// ---------------------------------------------------------------- the wallet

/** Balances, whether a withdrawal is possible right now, and exactly what is blocking it if not. */
export function getWallet() {
  return api.get<Wrapped<WalletSummary>>("/seller/wallet").then(unwrap);
}

/** What a withdrawal of this many KOBO would cost and what would reach the bank. Errors: `amount` (whole number, 1 or more). */
export function getPayoutQuote(amountKobo: number) {
  return api.get<Wrapped<PayoutQuote>>("/seller/payouts/quote", { query: { amount: amountKobo } }).then(unwrap);
}

/** The seller's withdrawals, newest first, 20 to a page. */
export function getPayouts(page = 1) {
  return api.get<Paginated<Payout>>("/seller/payouts", { query: { page: page > 1 ? page : undefined } });
}

/**
 * Withdraws this many KOBO. The amount leaves the available balance at once and the bank receives it minus the fee.
 * Problems arrive as a 422 or similar with a message: the blockers (`kyc`, `payout_account`, `account_hold`, ...)
 * or `amount` (below the minimum, or more than the balance). Never repeated automatically: it moves real money.
 */
export function requestPayout(amountKobo: number) {
  return api.post<Wrapped<Payout>>("/seller/payouts", { amount: amountKobo }).then(unwrap);
}

// ---------------------------------------------------------------- the orders

export type SellerOrderFilter = {
  status?: OrderStatus;
  page?: number;
};

/** The seller's paid orders, newest first, 20 to a page. Unpaid checkouts never appear. */
export function getSellerOrders({ status, page = 1 }: SellerOrderFilter = {}) {
  return api.get<Paginated<SellerOrder>>("/seller/orders", { query: { status, page: page > 1 ? page : undefined } });
}

export function getSellerOrder(orderNumber: string) {
  return api.get<Wrapped<SellerOrder>>(orderPath(orderNumber)).then(unwrap);
}

/**
 * "I've handed it over." Needs the tracking details: the courier and number, or the rider's name and phone,
 * 3 to 500 characters (error field `tracking_info`). Only possible while the order is "paid".
 */
export function shipOrder(orderNumber: string, trackingInfo: string) {
  return api.post<Wrapped<SellerOrder>>(`${orderPath(orderNumber)}/ship`, { tracking_info: trackingInfo }).then(unwrap);
}

/** "I can't fulfil this." The buyer is refunded in full. Only possible before shipping, while the order is "paid". */
export function cancelSellerOrder(orderNumber: string) {
  return api.post<Wrapped<SellerOrder>>(`${orderPath(orderNumber)}/cancel`).then(unwrap);
}