"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers/session-provider";
import { addToCart, clearCart, getCart, removeCartItem, setCartQuantity } from "@/lib/api/cart";
import type { Cart } from "@/lib/types/cart";

export const CART_KEY = ["cart"] as const;

/**
 * The buyer's cart. It has no data while loading, and none at all when nobody can have a cart yet
 * (logged out, or email not verified): in that case it does not even ask the API.
 *
 * Logging out wipes it, because the session provider clears everything private from the cache.
 */
export function useCart() {
  const { user } = useSession();

  return useQuery({
    queryKey: CART_KEY,
    queryFn: getCart,
    enabled: Boolean(user?.email_verified),
    staleTime: 30_000,
  });
}

/** How many things are in the cart, for the number on the cart icon. 0 when there is no cart. */
export function useCartCount(): number {
  return useCart().data?.item_count ?? 0;
}

/**
 * Every cart change answers with the whole updated cart. This puts that answer straight into the cache,
 * so every screen showing the cart changes at once, with no second request.
 *
 * Changes are never repeated automatically (the app's default for all writes): the person sees the
 * error and decides whether to try again.
 */
function useCartMutation<TVariables>(change: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: change,
    onSuccess: (cart) => queryClient.setQueryData(CART_KEY, cart),
  });
}

/** Adds to what is already in the cart. */
export const useAddToCart = () =>
  useCartMutation(({ listingId, quantity }: { listingId: number; quantity: number }) => addToCart(listingId, quantity));

/** Sets a cart line to exactly this quantity. */
export const useSetCartQuantity = () =>
  useCartMutation(({ itemId, quantity }: { itemId: number; quantity: number }) => setCartQuantity(itemId, quantity));

export const useRemoveCartItem = () => useCartMutation((itemId: number) => removeCartItem(itemId));

export const useClearCart = () => useCartMutation<void>(() => clearCart());