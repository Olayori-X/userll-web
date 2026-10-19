"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsSeller } from "@/hooks/use-seller";
import {
  cancelSellerOrder,
  getPayoutQuote,
  getPayouts,
  getSellerOrder,
  getSellerOrders,
  getWallet,
  requestPayout,
  shipOrder,
  type SellerOrderFilter,
} from "@/lib/api/seller-sales";
import type { SellerOrder } from "@/lib/types/seller-orders";

/** Everything about the seller's money and orders lives under ["seller", "sales", ...], so logging out wipes it all. */
const SALES_KEY = ["seller", "sales"] as const;
const WALLET_KEY = [...SALES_KEY, "wallet"] as const;
const PAYOUTS_KEY = [...SALES_KEY, "payouts"] as const;
const ORDERS_LIST_KEY = [...SALES_KEY, "orders", "list"] as const;
const orderListKey = (filter: SellerOrderFilter) => [...ORDERS_LIST_KEY, filter] as const;
const orderKey = (orderNumber: string) => [...SALES_KEY, "orders", "detail", orderNumber] as const;

/** A new sale or a finished withdrawal shows up on its own: the screens ask again every minute while in view. */
const POLL_MS = 60_000;

/** Balances, whether a withdrawal is possible, and what is blocking it. Kept fresh, since money moves. */
export function useWallet() {
  return useQuery({
    queryKey: WALLET_KEY,
    queryFn: getWallet,
    enabled: useIsSeller(),
    staleTime: 30_000,
    refetchInterval: POLL_MS,
  });
}

/** One page of the seller's orders. While the next page or filter loads, the old results stay on screen. */
export function useSellerOrders(filter: SellerOrderFilter = {}) {
  return useQuery({
    queryKey: orderListKey(filter),
    queryFn: () => getSellerOrders(filter),
    enabled: useIsSeller(),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
}

/** One order. Kept fresh for only 10 seconds: the buyer may have cancelled it since it was loaded. */
export function useSellerOrder(orderNumber: string) {
  return useQuery({
    queryKey: orderKey(orderNumber),
    queryFn: () => getSellerOrder(orderNumber),
    enabled: useIsSeller(),
    staleTime: 10_000,
  });
}

/**
 * An action on an order. The API answers with the whole updated order, which goes straight into the cache, so the
 * order page and the list change at once. A cancelled order changes what is held in escrow, so the wallet is refreshed too.
 *
 * When an action fails the order has usually changed since the screen loaded (the buyer cancelled, a timer ran),
 * so it is fetched again and the seller sees what it really is now.
 *
 * Actions are never repeated automatically (the app's default for all writes).
 */
function useOrderAction<TVariables extends { orderNumber: string }>(change: (variables: TVariables) => Promise<SellerOrder>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: change,
    onSuccess: (order) => {
      queryClient.setQueryData(orderKey(order.order_number), order);
      void queryClient.invalidateQueries({ queryKey: ORDERS_LIST_KEY });
      void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
    },
    onError: (_error, variables) => {
      void queryClient.invalidateQueries({ queryKey: orderKey(variables.orderNumber) });
    },
  });
}

/** "I've handed it over": needs the tracking details. */
export const useShipOrder = () =>
  useOrderAction(({ orderNumber, trackingInfo }: { orderNumber: string; trackingInfo: string }) => shipOrder(orderNumber, trackingInfo));

/** "I can't fulfil this": the buyer is refunded in full. */
export const useCancelSellerOrder = () => useOrderAction(({ orderNumber }: { orderNumber: string }) => cancelSellerOrder(orderNumber));

/** The seller's withdrawals, newest first. Asked again every minute, so a transfer that finishes shows as paid. */
export function usePayouts(page = 1) {
  return useQuery({
    queryKey: [...PAYOUTS_KEY, page],
    queryFn: () => getPayouts(page),
    enabled: useIsSeller(),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
}

/**
 * What withdrawing this many KOBO would cost. Pass null until there is an amount worth asking about. A bad
 * amount (a 422) is not retried: asking again cannot help.
 */
export function usePayoutQuote(amountKobo: number | null) {
  return useQuery({
    queryKey: [...SALES_KEY, "quote", amountKobo],
    queryFn: () => getPayoutQuote(amountKobo as number),
    enabled: useIsSeller() && amountKobo !== null && Number.isInteger(amountKobo) && amountKobo > 0,
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * Withdraws money. It is never repeated automatically, because it moves real money: a failed request shows its
 * reason and the seller decides. On success the balance and the list of withdrawals are fetched again.
 */
export function useRequestPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amountKobo: number) => requestPayout(amountKobo),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
      void queryClient.invalidateQueries({ queryKey: PAYOUTS_KEY });
    },
  });
}