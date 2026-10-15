/**
 * Addresses and paying: pick an address, create the checkout, start the payment, check how it went.
 * Needs a login and a verified email, like the cart.
 */

import { api } from "@/lib/api";
import type { Wrapped } from "@/lib/types/common";
import type { Address, Checkout, NewAddress, PaymentStart } from "@/lib/types/checkout";

const unwrap = <T>({ data }: Wrapped<T>) => data;

// ---------------------------------------------------------------- addresses

/** The buyer's saved addresses, default first. */
export function getAddresses() {
  return api.get<Wrapped<Address[]>>("/addresses").then(unwrap);
}

/**
 * Saves a new address (up to 10; the first one becomes the default). Problems come back as field errors.
 * A seventh-and-over problem arrives as `address`: "You can save up to 10 addresses."
 */
export function createAddress(input: NewAddress) {
  return api.post<Wrapped<Address>>("/addresses", input).then(unwrap);
}

/** Changes some fields of an address. Making one the default un-defaults the others. */
export function updateAddress(id: number, input: Partial<NewAddress>) {
  return api.patch<Wrapped<Address>>(`/addresses/${id}`, input).then(unwrap);
}

/** Deletes an address. If it was the default, the newest remaining one becomes the default. */
export function deleteAddress(id: number) {
  return api.delete<void>(`/addresses/${id}`);
}

// ---------------------------------------------------------------- paying

/**
 * Turns the cart into a checkout with one order per seller, delivering to this address. Nothing is paid yet.
 *
 * It cancels the buyer's older unpaid checkout, so never call it twice for one click.
 * Problems with the cart arrive as `cart`: "Your cart is empty." or one message per bad item
 * ("Headphones: Only 3 left", "...: you cannot buy your own listing"). Show all of them: error.errors.cart.
 */
export function createCheckout(addressId: number) {
  return api.post<Wrapped<Checkout>>("/checkout", { address_id: addressId }).then(unwrap);
}

/** A checkout of the buyer's own, for example to pick up where they left off. 404 for anyone else's. */
export function getCheckout(reference: string) {
  return api.get<Wrapped<Checkout>>(`/checkouts/${encodeURIComponent(reference)}`).then(unwrap);
}

/**
 * Starts a payment attempt and returns where to send the buyer: Paystack's own page (authorization_url).
 * Safe to call again for the same checkout, for example after the buyer backed out: each call is a new attempt.
 * A 422 on `checkout` means this checkout is no longer active and a new one must be started from the cart.
 */
export function startPayment(reference: string) {
  return api.post<Wrapped<PaymentStart>>(`/checkouts/${encodeURIComponent(reference)}/pay`).then(unwrap);
}

/**
 * Asks the API to ask Paystack what happened, and answers with the checkout as it now stands.
 * Call it when the buyer comes back from Paystack. The address bar is never trusted: only this call decides.
 */
export function verifyCheckout(reference: string) {
  return api.post<Wrapped<Checkout>>(`/checkouts/${encodeURIComponent(reference)}/verify`).then(unwrap);
}