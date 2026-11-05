"use client";

import { useState } from "react";
import Link from "next/link";
import { ReceiptText, TriangleAlert } from "lucide-react";
import { ApiError } from "@/lib/api";
import { usePayments, useRefundPayment } from "@/hooks/use-admin";
import { formatAge, formatDateTime } from "@/lib/dates";
import { flagInfo } from "@/lib/refund-labels";
import { toQueryString } from "@/lib/query-string";
import type { AdminPayment, PaymentStatus } from "@/lib/types/admin-payments";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";

const TABS: { status: PaymentStatus; label: string }[] = [
  { status: "needs_refund", label: "To refund" },
  { status: "refunded", label: "Refunded" },
  { status: "paid", label: "Paid" },
  { status: "pending", label: "Pending" },
  { status: "failed", label: "Failed" },
];

const paymentsHref = (status: PaymentStatus, page = 1) =>
  `/admin/payments${toQueryString({ status: status === "needs_refund" ? undefined : status, page: page > 1 ? page : undefined })}`;

/** The API's `payment` error ("only payments marked needs_refund can be refunded") is the most useful one when it comes. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("payment") ?? error.message;

  return "Something went wrong. Please try again.";
}

function RefundAction({ payment }: { payment: AdminPayment }) {
  const refund = useRefundPayment();
  const [confirming, setConfirming] = useState(false);
  const info = flagInfo(payment.flag);

  if (refund.isSuccess) {
    return (
      <Alert variant="success" title="Refund started">
        {payment.amount_formatted} is on its way back to the buyer, and they&apos;ve been told why. Follow it on the{" "}
        <Link href="/admin/refunds" className="font-semibold underline">
          Refunds page
        </Link>
        .
      </Alert>
    );
  }

  if (confirming) {
    return (
      <ConfirmPanel
        title={`Refund ${payment.amount_formatted} to the buyer?`}
        confirmLabel="Yes, refund"
        keepLabel="Not yet"
        destructive
        loading={refund.isPending}
        error={refund.isError ? errorText(refund.error) : null}
        onConfirm={() => refund.mutate(payment.id)}
        onKeep={() => {
          refund.reset();
          setConfirming(false);
        }}
      >
        {info.checkFirst && "You should have confirmed the amount in the Paystack dashboard first. "}
        The whole payment goes back to the buyer, and they&apos;re told why they have no order. This can&apos;t be undone.
      </ConfirmPanel>
    );
  }

  return (
    <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setConfirming(true)}>
      Refund the buyer
    </Button>
  );
}

function Row({ payment, status }: { payment: AdminPayment; status: PaymentStatus }) {
  const needsRefund = status === "needs_refund";
  const info = flagInfo(payment.flag);
  const age = formatAge(payment.created_at);

  return (
    <li className="grid gap-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <p className="text-base font-bold">{payment.amount_formatted}</p>
          <p className="truncate text-xs text-muted-foreground">
            {payment.reference}
            {payment.checkout_reference && ` · ${payment.checkout_reference}`}
          </p>
          <p className="text-xs text-muted-foreground">
            <time dateTime={payment.created_at}>{formatDateTime(payment.created_at)}</time>
            {age && ` (${age} ago)`}
          </p>
        </div>

        {needsRefund && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning">
            {info.label}
          </span>
        )}
      </div>

      {needsRefund && (
        <>
          <p className="text-sm text-muted-foreground">{info.explain}</p>

          {info.checkFirst && (
            <p className="flex items-start gap-2 text-xs font-semibold text-destructive">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Check the amount in the Paystack dashboard before refunding. Search for {payment.reference}.
            </p>
          )}

          <RefundAction payment={payment} />
        </>
      )}
    </li>
  );
}

type PaymentQueueProps = {
  /** From the address, already checked. "needs_refund" when the address names nothing. */
  status: PaymentStatus;
  page: number;
};

/** Payments by status. The default tab is the one that matters: buyers who paid but couldn't get an order. */
export function PaymentQueue({ status, page }: PaymentQueueProps) {
  const queue = usePayments({ status, page });

  return (
    <div className="grid gap-5">
      <nav aria-label="Filter payments">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const active = tab.status === status;

            return (
              <li key={tab.status} className="shrink-0">
                <Link
                  href={paymentsHref(tab.status)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                  {tab.status === "needs_refund" && status === "needs_refund" && queue.data && queue.data.meta.total > 0 && ` (${queue.data.meta.total})`}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {queue.isPending && <PageSkeleton label="Loading payments" />}

      {queue.isError && (
        <Alert variant="error" title="We couldn't load the payments">
          <Button variant="link" onClick={() => void queue.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {queue.data && queue.data.data.length === 0 && (
        <PageNotice
          icon={<ReceiptText className="size-7" aria-hidden />}
          title={status === "needs_refund" ? "Nothing to refund" : page > 1 ? "Nothing on this page" : "Nothing here"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {status === "needs_refund"
              ? "No buyer is waiting for money back."
              : page > 1
                ? "There are no payments on this page."
                : "No payments have this status."}
          </p>
          {page > 1 && (
            <Link href={paymentsHref(status)} className={buttonVariants({ size: "lg" })}>
              Back to the first page
            </Link>
          )}
        </PageNotice>
      )}

      {queue.data && queue.data.data.length > 0 && (
        <>
          <ul
            className={cn(
              "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card transition-opacity",
              queue.isPlaceholderData && "opacity-60",
            )}
          >
            {queue.data.data.map((payment) => (
              <Row key={payment.id} payment={payment} status={status} />
            ))}
          </ul>

          <Pagination
            currentPage={queue.data.meta.current_page}
            lastPage={queue.data.meta.last_page}
            hrefFor={(target) => paymentsHref(status, target)}
          />
        </>
      )}
    </div>
  );
}