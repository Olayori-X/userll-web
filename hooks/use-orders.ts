"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers/session-provider";
import {
  cancelOrder,
  confirmOrder,
  createReview,
  getMyReview,
  getOrder,
  getOrders,
  openDispute,
  type OrderFilter,
} from "@/lib/api/orders";
import type { Order } from "@/lib/types/checkout";
import type { DisputeInput, ReviewInput } from "@/lib/types/orders";

/**
 * Everything about the buyer's orders lives under ["orders", ...] in the cache. The payment screen
 * already refreshes this whole group when a purchase lands, so a new order shows up on its own.
 */
const ORDERS_KEY = ["orders"] as const;

const listKey = (filter: OrderFilter) => [...ORDERS_KEY, "list", filter] as const;
const detailKey = (orderNumber: string) => [...ORDERS_KEY, "detail", orderNumber] as const;
const reviewKey = (orderNumber: string) => [...ORDERS_KEY, "review", orderNumber] as const;

/** Like the cart: only asked for someone who can have orders (logged in, email verified). Logging out wipes it. */
function useCanHaveOrders() {
  const { user } = useSession();

  return Boolean(user?.email_verified);
}

/** One page of the buyer's orders. While the next page or filter loads, the old results stay on screen. */
export function useOrders(filter: OrderFilter = {}) {
  return useQuery({
    queryKey: listKey(filter),
    queryFn: () => getOrders(filter),
    enabled: useCanHaveOrders(),
    placeholderData: keepPreviousData,
  });
}

/**
 * One order. Kept fresh for only 10 seconds, so coming back to the tab shows what changed meanwhile:
 * a seller may have shipped it.
 */
export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: detailKey(orderNumber),
    queryFn: () => getOrder(orderNumber),
    enabled: useCanHaveOrders(),
    staleTime: 10_000,
  });
}

/** The buyer's review of this order, or null when they have not written one. Pass `enabled: false` until it matters. */
export function useMyReview(orderNumber: string, enabled = true) {
  return useQuery({
    queryKey: reviewKey(orderNumber),
    queryFn: () => getMyReview(orderNumber),
    enabled: useCanHaveOrders() && enabled,
  });
}

/**
 * An action on an order. The API answers with the whole updated order, which goes straight into the cache,
 * so the detail screen and the list change at once.
 *
 * When an action fails the order has usually changed since the screen loaded (the seller shipped it,
 * a timer released it), so the order is fetched again. The person then sees what it really is now.
 *
 * Actions are never repeated automatically (the app's default for all writes).
 */
function useOrderMutation<TVariables extends { orderNumber: string }>(change: (variables: TVariables) => Promise<Order>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: change,
    onSuccess: (order) => {
      queryClient.setQueryData(detailKey(order.order_number), order);
      void queryClient.invalidateQueries({ queryKey: [...ORDERS_KEY, "list"] });
    },
    onError: (_error, variables) => {
      void queryClient.invalidateQueries({ queryKey: detailKey(variables.orderNumber) });
    },
  });
}

/** "I received it": releases the seller's money. */
export const useConfirmOrder = () => useOrderMutation(({ orderNumber }: { orderNumber: string }) => confirmOrder(orderNumber));

/** A change of mind before the seller ships. */
export const useCancelOrder = () => useOrderMutation(({ orderNumber }: { orderNumber: string }) => cancelOrder(orderNumber));

/** "There is a problem": freezes the order for an admin to decide. */
export const useOpenDispute = () =>
  useOrderMutation(({ orderNumber, input }: { orderNumber: string; input: DisputeInput }) => openDispute(orderNumber, input));

/** Reviews a completed order. The saved review goes straight into the cache, so the form is replaced by it. */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderNumber, input }: { orderNumber: string; input: ReviewInput }) => createReview(orderNumber, input),
    onSuccess: (review, { orderNumber }) => {
      queryClient.setQueryData(reviewKey(orderNumber), review);
    },
  });
}