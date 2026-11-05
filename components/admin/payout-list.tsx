"use client";

import Form from "next/form";
import Link from "next/link";
import { Banknote, Search, TriangleAlert } from "lucide-react";
import { useAdminPayouts } from "@/hooks/use-admin";
import { formatAge, formatDateTime } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { toQueryString } from "@/lib/query-string";
import type { AdminPayout } from "@/lib/types/admin-payouts";
import type { PayoutStatus } from "@/lib/types/wallet";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

type TabStatus = PayoutStatus | "all";

const TABS: { status: TabStatus; label: string }[] = [
  { status: "all", label: "All" },
  { status: "pending", label: "About to send" },
  { status: "processing", label: "With the bank" },
  { status: "paid", label: "Paid" },
  { status: "failed", label: "Failed" },
  { status: "reversed", label: "Returned" },
];

const LOOK: Record<PayoutStatus, { label: string; classes: string }> = {
  pending: { label: "About to send", classes: "bg-info-soft text-info" },
  processing: { label: "With the bank", classes: "bg-info-soft text-info" },
  paid: { label: "Paid", classes: "bg-success-soft text-success" },
  failed: { label: "Failed", classes: "bg-danger-soft text-destructive" },
  reversed: { label: "Returned", classes: "bg-danger-soft text-destructive" },
};

/**
 * A withdrawal that has not moved for this long is the one to look at. A job tidies up transfers that stall, so anything
 * still stuck after this is worth checking in Paystack's Transfers page.
 */
const STUCK_AFTER_MINUTES = 30;

type Filters = { status: TabStatus; reference?: string; sellerId?: number };

function payoutsHref({ status, reference, sellerId }: Filters, page = 1): string {
  return `/admin/payouts${toQueryString({
    status: status === "all" ? undefined : status,
    reference,
    seller: sellerId,
    page: page > 1 ? page : undefined,
  })}`;
}

function minutesSince(timestamp: string): number | null {
  const time = new Date(timestamp).getTime();

  return Number.isNaN(time) ? null : (Date.now() - time) / 60_000;
}

function Row({ payout }: { payout: AdminPayout }) {
  const look = LOOK[payout.status];
  const inFlight = payout.status === "pending" || payout.status === "processing";
  const idle = inFlight ? minutesSince(payout.updated_at) : null;
  const stuck = idle !== null && idle >= STUCK_AFTER_MINUTES;
  const failed = payout.status === "failed" || payout.status === "reversed";

  return (
    <li className="grid gap-2 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <p className="text-base font-bold">{formatNaira(payout.net_amount)}</p>
          <p className="text-xs text-muted-foreground">
            {formatNaira(payout.amount)} withdrawn, {payout.fee === 0 ? "no fee" : `${formatNaira(payout.fee)} fee`}
          </p>
        </div>

        <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", look.classes)}>{look.label}</span>
      </div>

      <p className="truncate text-sm">
        <Link href={`/admin/payouts?seller=${payout.seller.id}`} className="font-semibold hover:text-primary hover:underline">
          {payout.seller.store_name ?? payout.seller.name ?? "Unknown seller"}
        </Link>
        <span className="text-muted-foreground">
          {payout.seller.email && ` · ${payout.seller.email}`}
        </span>
      </p>

      <p className="truncate text-xs text-muted-foreground">
        {[payout.bank_name, payout.account_name, payout.account_number].filter(Boolean).join(" · ") || "No bank details"}
      </p>

      <p className="text-xs text-muted-foreground">
        Requested {formatDateTime(payout.requested_at)}
        {payout.status === "paid" && payout.paid_at && ` · arrived ${formatDateTime(payout.paid_at)}`}
      </p>

      {(payout.paystack_reference || payout.paystack_transfer_code) && (
        <p className="break-all font-mono text-[11px] text-muted-foreground">
          {[payout.paystack_reference, payout.paystack_transfer_code].filter(Boolean).join(" · ")}
        </p>
      )}

      {stuck && (
        <p className="flex items-start gap-2 text-xs font-semibold text-destructive">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Hasn&apos;t moved for {formatAge(payout.updated_at)}. Search the reference in Paystack&apos;s Transfers page to see where it is.
        </p>
      )}

      {failed && payout.failure_reason && (
        <div className="grid gap-0.5 rounded-lg bg-muted/60 p-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground">Paystack&apos;s own words. The seller is shown a plain version, not this.</p>
          <p className="text-xs break-words">{payout.failure_reason}</p>
        </div>
      )}

      {failed && <p className="text-xs text-muted-foreground">The money is back in the seller&apos;s available balance.</p>}
    </li>
  );
}

type PayoutListProps = Filters & { page: number };

export function PayoutList({ status, reference, sellerId, page }: PayoutListProps) {
  const list = useAdminPayouts({ status: status === "all" ? undefined : status, reference, sellerId, page });
  const filters: Filters = { status, reference, sellerId };
  const narrowed = Boolean(reference || sellerId);

  return (
    <div className="grid gap-5">
      {/* A plain form: it opens /admin/payouts?reference=..., with no code needed in the browser. */}
      <Form action="/admin/payouts" role="search" className="flex gap-2">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        {sellerId && <input type="hidden" name="seller" value={sellerId} />}

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            name="reference"
            defaultValue={reference}
            maxLength={100}
            placeholder="Paystack reference or transfer code"
            aria-label="Paystack reference or transfer code"
            autoComplete="off"
            className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 md:text-sm"
          />
        </div>

        <Button type="submit">Find</Button>
      </Form>

      <nav aria-label="Filter withdrawals">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const active = tab.status === status;

            return (
              <li key={tab.status} className="shrink-0">
                <Link
                  href={payoutsHref({ ...filters, status: tab.status })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {narrowed && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm">
          <span className="text-muted-foreground">
            {sellerId && `Only one seller's withdrawals. `}
            {reference && `Matching "${reference}". `}
          </span>
          <Link href={payoutsHref({ status })} className="font-semibold text-primary hover:underline">
            Clear
          </Link>
        </p>
      )}

      {list.isPending && <PageSkeleton label="Loading withdrawals" />}

      {list.isError && (
        <Alert variant="error" title="We couldn't load the withdrawals">
          <Button variant="link" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {list.data && list.data.data.length === 0 && (
        <PageNotice icon={<Banknote className="size-7" aria-hidden />} title={page > 1 ? "Nothing on this page" : "No withdrawals found"}>
          <p className="max-w-sm text-sm text-muted-foreground">
            {narrowed ? "Nothing matches that. Check the reference, or clear the filter." : "There are no withdrawals with this status."}
          </p>
          {(page > 1 || narrowed) && (
            <Link href={payoutsHref({ status })} className={buttonVariants({ size: "lg" })}>
              {narrowed ? "Clear the filter" : "Back to the first page"}
            </Link>
          )}
        </PageNotice>
      )}

      {list.data && list.data.data.length > 0 && (
        <>
          <ul
            className={cn(
              "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card transition-opacity",
              list.isPlaceholderData && "opacity-60",
            )}
          >
            {list.data.data.map((payout) => (
              <Row key={payout.id} payout={payout} />
            ))}
          </ul>

          <Pagination
            currentPage={list.data.meta.current_page}
            lastPage={list.data.meta.last_page}
            hrefFor={(target) => payoutsHref(filters, target)}
          />
        </>
      )}
    </div>
  );
}