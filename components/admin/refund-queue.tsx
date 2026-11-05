"use client";

import { useState } from "react";
import Link from "next/link";
import { Undo2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useRefunds, useRetryRefund } from "@/hooks/use-admin";
import { formatDateTime } from "@/lib/dates";
import { REFUND_STATUS, refundReason } from "@/lib/refund-labels";
import { toQueryString } from "@/lib/query-string";
import type { AdminRefund, RefundStatus } from "@/lib/types/admin-payments";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";

/** "all" is the list with no filter. */
type TabStatus = RefundStatus | "all";

const TABS: { status: TabStatus; label: string }[] = [
  { status: "failed", label: "Failed" },
  { status: "needs_attention", label: "Needs attention" },
  { status: "processing", label: "In progress" },
  { status: "processed", label: "Done" },
  { status: "all", label: "All" },
];

const TONES = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-destructive",
  warning: "bg-warning-soft text-warning",
} as const;

const refundsHref = (status: TabStatus, page = 1) =>
  `/admin/refunds${toQueryString({ status: status === "failed" ? undefined : status, page: page > 1 ? page : undefined })}`;

/** The API's `refund` error ("only failed refunds can be retried") is the most useful one when it comes. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("refund") ?? error.message;

  return "Something went wrong. Please try again.";
}

function RetryAction({ refund }: { refund: AdminRefund }) {
  const retry = useRetryRefund();
  const [confirming, setConfirming] = useState(false);

  if (retry.isSuccess) {
    return <Alert variant="success">Sent again. It should move on from "About to send" within a minute.</Alert>;
  }

  if (confirming) {
    return (
      <ConfirmPanel
        title={`Send this ${refund.amount_formatted} refund again?`}
        confirmLabel="Yes, I've checked. Retry"
        keepLabel="Not yet"
        destructive
        loading={retry.isPending}
        error={retry.isError ? errorText(retry.error) : null}
        onConfirm={() => retry.mutate(refund.id)}
        onKeep={() => {
          retry.reset();
          setConfirming(false);
        }}
      >
        Have you looked for {refund.payment_reference ?? "this payment"} in the Paystack dashboard? If the money already went back to the
        buyer, retrying refunds them a second time, and that can&apos;t be taken back.
      </ConfirmPanel>
    );
  }

  return (
    <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setConfirming(true)}>
      Retry
    </Button>
  );
}

function Row({ refund }: { refund: AdminRefund }) {
  const info = REFUND_STATUS[refund.status];
  const placed = formatDateTime(refund.created_at);

  return (
    <li className="grid gap-2.5 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <p className="text-base font-bold">{refund.amount_formatted}</p>
          <p className="text-sm text-muted-foreground">{refundReason(refund.reason)}</p>
        </div>

        <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[info.tone])}>
          {info.label}
        </span>
      </div>

      <p className="truncate text-xs text-muted-foreground">
        {[refund.payment_reference, refund.order_number && `Order ${refund.order_number}`, refund.paystack_refund_id && `Paystack ${refund.paystack_refund_id}`]
          .filter(Boolean)
          .join(" · ")}
        {placed && ` · ${placed}`}
      </p>

      {(refund.status === "failed" || refund.status === "needs_attention") && <p className="text-sm text-muted-foreground">{info.hint}</p>}

      {refund.status === "failed" && refund.failure_note && (
        <p className="text-sm font-medium text-destructive">Why it failed: {refund.failure_note}</p>
      )}

      {refund.status === "failed" && <RetryAction refund={refund} />}
    </li>
  );
}

type RefundQueueProps = {
  /** From the address, already checked. "failed" when the address names nothing. */
  status: TabStatus;
  page: number;
};

/** Refunds by status. The default tab is the failed ones: money that should be back with a buyer and isn't. */
export function RefundQueue({ status, page }: RefundQueueProps) {
  const queue = useRefunds({ status: status === "all" ? undefined : status, page });

  return (
    <div className="grid gap-5">
      <nav aria-label="Filter refunds">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const active = tab.status === status;

            return (
              <li key={tab.status} className="shrink-0">
                <Link
                  href={refundsHref(tab.status)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                  {tab.status === "failed" && status === "failed" && queue.data && queue.data.meta.total > 0 && ` (${queue.data.meta.total})`}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {queue.isPending && <PageSkeleton label="Loading refunds" />}

      {queue.isError && (
        <Alert variant="error" title="We couldn't load the refunds">
          <Button variant="link" onClick={() => void queue.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {queue.data && queue.data.data.length === 0 && (
        <PageNotice
          icon={<Undo2 className="size-7" aria-hidden />}
          title={status === "failed" ? "No failed refunds" : page > 1 ? "Nothing on this page" : "Nothing here"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {status === "failed"
              ? "Every refund that was sent has gone through, or is still on its way."
              : page > 1
                ? "There are no refunds on this page."
                : "No refunds have this status."}
          </p>
          {page > 1 && (
            <Link href={refundsHref(status)} className={buttonVariants({ size: "lg" })}>
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
            {queue.data.data.map((refund) => (
              <Row key={refund.id} refund={refund} />
            ))}
          </ul>

          <Pagination
            currentPage={queue.data.meta.current_page}
            lastPage={queue.data.meta.last_page}
            hrefFor={(target) => refundsHref(status, target)}
          />
        </>
      )}
    </div>
  );
}