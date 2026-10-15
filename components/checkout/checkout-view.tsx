"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Lock, ShoppingCart } from "lucide-react";
import { ApiError } from "@/lib/api";
import { createCheckout, startPayment } from "@/lib/api/checkout";
import { useCart } from "@/hooks/use-cart";
import { formatNaira } from "@/lib/money";
import { AddressPicker } from "@/components/checkout/address-picker";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { isPaystackUrl } from "@/lib/paystack";


/** Everything the API objected to, as a list of plain sentences: one per bad cart item, or a single message. */
function problemsFrom(error: unknown): string[] {
  if (error instanceof ApiError) {
    if (error.isValidation) {
      const all = Object.values(error.errors).flat();

      if (all.length > 0) return all;
    }

    return [error.message];
  }

  return ["Something went wrong. Please try again."];
}

type Made = { reference: string; addressId: number; total: number };

export function CheckoutView() {
  const cart = useCart();
  const [addressId, setAddressId] = useState<number | null>(null);

  /**
   * The checkout we already created for this cart. If starting the payment fails (Paystack briefly down), the
   * next click retries on the same checkout instead of making a second one, because every new checkout
   * cancels the previous unpaid one.
   */
  const made = useRef<Made | null>(null);

  const pay = useMutation({
    mutationFn: async ({ addressId, total }: { addressId: number; total: number }) => {
      const existing = made.current;
      let reference = existing && existing.addressId === addressId && existing.total === total ? existing.reference : null;

      if (!reference) {
        const checkout = await createCheckout(addressId);

        made.current = { reference: checkout.reference, addressId, total: checkout.total };
        reference = checkout.reference;
      }

      try {
        const payment = await startPayment(reference);

        if (!isPaystackUrl(payment.authorization_url)) {
          throw new ApiError(502, "We couldn't open the payment page. Please try again.");
        }

        return payment;
      } catch (error) {
        // "This checkout is no longer active": forget it, so the next click starts a fresh one.
        if (error instanceof ApiError && error.status === 422) made.current = null;

        throw error;
      }
    },
    onSuccess: (payment) => window.location.assign(payment.authorization_url),
  });

  // Coming back with the browser's Back button restores this page exactly as it was: busy, waiting. Reset it.
  const { reset } = pay;
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };

    window.addEventListener("pageshow", onPageShow);

    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reset]);

  // The cart may have changed since it was last loaded (another tab, an item selling out): look again once.
  const { refetch } = cart;
  const refreshed = useRef(false);
  useEffect(() => {
    if (refreshed.current) return;

    refreshed.current = true;
    void refetch();
  }, [refetch]);

  if (cart.isPending) return <PageSkeleton label="Loading checkout" />;

  if (cart.isError) {
    return (
      <Alert variant="error" title="We couldn't load your checkout">
        <Button variant="link" onClick={() => void cart.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const data = cart.data;

  if (data.items.length === 0) {
    return (
      <PageNotice icon={<ShoppingCart className="size-7" aria-hidden />} title="Your cart is empty">
        <p className="text-sm text-muted-foreground">Add something to your cart first.</p>
        <Link href="/listings" className={buttonVariants({ size: "lg" })}>
          Browse products
        </Link>
      </PageNotice>
    );
  }

  const sellerCount = new Set(data.items.map((item) => item.store_slug)).size;
  const problems = pay.isError ? problemsFrom(pay.error) : [];
  const busy = pay.isPending || pay.isSuccess; // stays busy after success too: the browser is on its way to Paystack

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          Back to cart
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="grid gap-8">
          <section aria-labelledby="address-heading" className="grid gap-4">
            <h2 id="address-heading" className="text-lg font-bold">
              1. Delivery address
            </h2>
            <AddressPicker selectedId={addressId} onSelect={setAddressId} />
          </section>

          <section aria-labelledby="payment-heading" className="grid gap-3">
            <h2 id="payment-heading" className="text-lg font-bold">
              2. Payment
            </h2>
            <div className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p className="text-muted-foreground">
                You&apos;ll pay on Paystack&apos;s secure page and choose how to pay there. We hold your money until your
                order arrives.
              </p>
            </div>
          </section>
        </div>

        <aside aria-label="Order summary" className="grid gap-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Order summary</h2>

          <ul className="grid gap-2 text-sm">
            {data.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {item.title} <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="shrink-0 font-medium">{formatNaira(item.line_total)}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            {sellerCount === 1 ? "From 1 seller." : `From ${sellerCount} sellers: each seller's items are a separate order.`}
          </p>

          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right font-medium">{formatNaira(data.subtotal)}</dd>

            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="text-right font-medium">{data.delivery_total === 0 ? "Free" : formatNaira(data.delivery_total)}</dd>

            <dt className="border-t border-border pt-3 font-bold">Total</dt>
            <dd className="border-t border-border pt-3 text-right text-lg font-extrabold">{formatNaira(data.total)}</dd>
          </dl>

          {!data.can_checkout && (
            <Alert variant="error">
              Some items in your cart need attention.{" "}
              <Link href="/cart" className="font-semibold underline">
                Review your cart
              </Link>
            </Alert>
          )}

          {problems.length > 0 && (
            <Alert variant="error" title={problems.length > 1 ? "Fix these before paying" : undefined}>
              {problems.length === 1 ? (
                problems[0]
              ) : (
                <ul className="list-disc pl-4">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              )}
              <Link href="/cart" className="mt-1 inline-block font-semibold underline">
                Review your cart
              </Link>
            </Alert>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={!data.can_checkout || addressId === null}
            loading={busy}
            onClick={() => {
              if (addressId !== null) pay.mutate({ addressId, total: data.total });
            }}
          >
            Pay {formatNaira(data.total)}
          </Button>

          {addressId === null && (
            <p className="text-center text-xs text-muted-foreground">Choose a delivery address to continue.</p>
          )}
        </aside>
      </div>
    </div>
  );
}