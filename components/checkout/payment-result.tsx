"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Clock, LoaderCircle, TriangleAlert, XCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { startPayment, verifyCheckout } from "@/lib/api/checkout";
import { CART_KEY } from "@/hooks/use-cart";
import { formatNaira } from "@/lib/money";
import { isPaystackUrl } from "@/lib/paystack";
import type { Order } from "@/lib/types/checkout";
import { PageNotice } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

/** "CHK-" and the API's id. Anything else in the address is not one of our checkouts. */
const REFERENCE_PATTERN = /^CHK-[0-9A-Z]{10,40}$/;

function formatDay(timestamp: string | null): string | null {
  if (!timestamp) return null;

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(date);
}

function OrderSummary({ order }: { order: Order }) {
  const shipBy = formatDay(order.ship_by_at);

  return (
    <li className="grid gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{order.seller?.store_name ?? "Seller"}</p>
        <p className="text-xs text-muted-foreground">Order {order.order_number}</p>
      </div>

      <ul className="grid gap-1 text-sm">
        {order.items.map((item, index) => (
          <li key={index} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">
              {item.title} <span className="text-muted-foreground">× {item.quantity}</span>
            </span>
            <span className="shrink-0">{formatNaira(item.line_total)}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">{shipBy ? `Seller ships by ${shipBy}` : "Waiting for the seller to ship"}</span>
        <span className="font-bold">{formatNaira(order.total)}</span>
      </div>
    </li>
  );
}

function PaidView({ orders }: { orders: Order[] }) {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="grid justify-items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <CircleCheck className="size-9" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Payment received</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Thank you! {orders.length === 1 ? "The seller has" : "The sellers have"} been told to get your order ready. We hold
          your money until it arrives, and only then pass it on.
        </p>
      </div>

      <ul className="grid gap-3">
        {orders.map((order) => (
          <OrderSummary key={order.order_number} order={order} />
        ))}
      </ul>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/orders" className={buttonVariants({ size: "lg" })}>
          View my orders
        </Link>
        <Link href="/listings" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Keep shopping
        </Link>
      </div>
    </div>
  );
}

function Verified({ reference }: { reference: string }) {
  const queryClient = useQueryClient();

  // Asks the API to ask Paystack. Never trusts the address bar: only this answer decides what the buyer sees.
  const check = useQuery({
    queryKey: ["checkout-verify", reference],
    queryFn: () => verifyCheckout(reference),
    refetchOnWindowFocus: false, // every check goes to Paystack, so only when the buyer asks
    refetchOnReconnect: false,
    staleTime: 0,
  });

  const status = check.data?.status;

  // Paid: what was bought has left the cart, and there are new orders to show.
  useEffect(() => {
    if (status !== "paid") return;

    void queryClient.invalidateQueries({ queryKey: CART_KEY });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  }, [status, queryClient]);

  // The same checkout can be paid again: the API opens a fresh payment attempt each time.
  const payAgain = useMutation({
    mutationFn: async () => {
      const payment = await startPayment(reference);

      if (!isPaystackUrl(payment.authorization_url)) {
        throw new ApiError(502, "We couldn't open the payment page. Please try again.");
      }

      return payment;
    },
    onSuccess: (payment) => window.location.assign(payment.authorization_url),
  });

  if (check.isPending) {
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-4 py-16 text-center" role="status">
        <LoaderCircle className="size-10 animate-spin text-primary" aria-hidden />
        <h1 className="text-xl font-bold tracking-tight">Confirming your payment…</h1>
        <p className="text-sm text-muted-foreground">This takes a few seconds. Please don&apos;t close this page.</p>
      </div>
    );
  }

  if (check.isError) {
    const notFound = check.error instanceof ApiError && check.error.status === 404;

    if (notFound) {
      return (
        <PageNotice icon={<TriangleAlert className="size-7" aria-hidden />} title="We couldn't find that checkout">
          <p className="text-sm text-muted-foreground">It may belong to a different account. Start again from your cart.</p>
          <Link href="/cart" className={buttonVariants({ size: "lg" })}>
            Go to cart
          </Link>
        </PageNotice>
      );
    }

    return (
      <PageNotice icon={<TriangleAlert className="size-7" aria-hidden />} title="We couldn't check your payment">
        <p className="text-sm text-muted-foreground">
          {check.error instanceof ApiError ? check.error.message : "Something went wrong."} If you&apos;ve already paid,
          please don&apos;t pay again: your order will be confirmed automatically, and you&apos;ll find it under My orders
          in a few minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" loading={check.isFetching} onClick={() => void check.refetch()}>
            Check again
          </Button>
          <Link href="/orders" className={buttonVariants({ variant: "outline", size: "lg" })}>
            My orders
          </Link>
        </div>
      </PageNotice>
    );
  }

  const checkout = check.data;

  if (checkout.status === "paid") return <PaidView orders={checkout.orders} />;

  if (checkout.status === "pending") {
    const payError = payAgain.error;
    const payMessage =
      payError instanceof ApiError
        ? (payError.fieldError("checkout") ?? payError.message)
        : payError
          ? "Something went wrong. Please try again."
          : null;

    return (
      <PageNotice icon={<Clock className="size-7" aria-hidden />} title="We haven't received your payment">
        <p className="max-w-sm text-sm text-muted-foreground">
          If you closed the payment page before finishing, you can pay now. If you&apos;ve just paid, give it a moment and
          check again: bank transfers can take a few minutes.
        </p>

        {payMessage && <Alert variant="error">{payMessage}</Alert>}

        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" loading={payAgain.isPending || payAgain.isSuccess} onClick={() => payAgain.mutate()}>
            Pay {formatNaira(checkout.total)}
          </Button>
          <Button variant="outline" size="lg" loading={check.isFetching} onClick={() => void check.refetch()}>
            I&apos;ve paid, check again
          </Button>
        </div>

        <Link href="/cart" className="text-sm font-semibold text-primary hover:underline">
          Back to cart
        </Link>
      </PageNotice>
    );
  }

  // Cancelled or expired.
  return (
    <PageNotice
      icon={<XCircle className="size-7" aria-hidden />}
      title={checkout.status === "expired" ? "This checkout expired" : "This checkout was cancelled"}
    >
      <p className="max-w-sm text-sm text-muted-foreground">
        {checkout.status === "expired"
          ? "It wasn't paid in time. Your items are still in your cart, so you can start again."
          : "It was replaced by a newer checkout, or something sold out before your payment went through. If any money was taken from you, it will be refunded."}
      </p>
      <Link href="/cart" className={buttonVariants({ size: "lg" })}>
        Back to cart
      </Link>
    </PageNotice>
  );
}

type PaymentResultProps = {
  /** The checkout reference from the address Paystack sent the buyer back to. */
  reference: string | null;
};

export function PaymentResult({ reference }: PaymentResultProps) {
  if (!reference || !REFERENCE_PATTERN.test(reference)) {
    return (
      <PageNotice icon={<TriangleAlert className="size-7" aria-hidden />} title="This link looks incomplete">
        <p className="text-sm text-muted-foreground">
          If you just paid, you&apos;ll find your order under My orders in a few minutes.
        </p>
        <Link href="/orders" className={buttonVariants({ size: "lg" })}>
          My orders
        </Link>
      </PageNotice>
    );
  }

  return <Verified reference={reference} />;
}