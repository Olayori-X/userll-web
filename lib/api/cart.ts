/**
 * The buyer's cart. Needs a login and a verified email: logged out gives a 401, an unverified email gives a 403
 * ("Your email address is not verified.").
 *
 * Every call answers with the whole updated cart, so the screen can replace what it has.
 */

import { api } from "@/lib/api";
import type { Cart } from "@/lib/types/cart";
import type { Wrapped } from "@/lib/types/common";

const unwrap = ({ data }: Wrapped<Cart>) => data;

export function getCart() {
  return api.get<Wrapped<Cart>>("/cart").then(unwrap);
}

/**
 * Adds to what is already in the cart: adding 2 and then 1 more gives 3. Problems come back as field errors:
 * `listing_id` ("This item is no longer available.", "You cannot buy your own listing.") and
 * `quantity` ("Only 3 available.", counting what is already in the cart).
 */
export function addToCart(listingId: number, quantity = 1) {
  return api.post<Wrapped<Cart>>("/cart/items", { listing_id: listingId, quantity }).then(unwrap);
}

/** Sets the quantity of a cart line to this number (1 to 100). Unlike addToCart, it replaces, not adds. */
export function setCartQuantity(itemId: number, quantity: number) {
  return api.patch<Wrapped<Cart>>(`/cart/items/${itemId}`, { quantity }).then(unwrap);
}

export function removeCartItem(itemId: number) {
  return api.delete<Wrapped<Cart>>(`/cart/items/${itemId}`).then(unwrap);
}

export function clearCart() {
  return api.delete<Wrapped<Cart>>("/cart").then(unwrap);
}