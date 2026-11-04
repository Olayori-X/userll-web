"use client";

import Link from "next/link";
import { ChevronRight, FileWarning } from "lucide-react";
import { useDisputes } from "@/hooks/use-admin";
import { formatAge, formatDay } from "@/lib/dates";
import { DISPUTE_REASON_LABEL, RESOLUTION_INFO, SLOW_DISPUTE_HOURS, hoursSince } from "@/lib/dispute";
import { toQueryString } from "@/lib/query-string";
import type { AdminDispute, DisputeStatus } from "@/lib/types/admin-disputes";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

const TABS: { status: DisputeStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "resolved", label: "Resolved" },
];

const disputesHref = (status: DisputeStatus, page = 1) =>
  `/admin/disputes${toQueryString({ status: status === "open" ? undefined : status, page: page > 1 ? page : undefined })}`;

function Row({ dispute, status }: { dispute: AdminDispute; status: DisputeStatus }) {
  const age = formatAge(dispute.created_at);
  const waiting = hoursSince(dispute.created_at);
  const slow = status === "open" && waiting !== null && waiting >= SLOW_DISPUTE_HOURS;
  const decided = formatDay(dispute.resolved_at);
  const items = dispute.order?.items ?? [];
  const [first, ...rest] = items;

  return (
    <Link
      href={`/admin/disputes/${dispute.id}`}
      className="flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
    >
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{DISPUTE_REASON_LABEL[dispute.reason]}</span>
          {dispute.order && <span className="text-xs text-muted-foreground">{dispute.order.order_number}</span>}
        </div>

        <p className="truncate text-xs text-muted-foreground">
          {[dispute.opened_by?.name, dispute.order?.store_name && `against ${dispute.order.store_name}`, dispute.order?.total_formatted]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {first && (
          <p className="truncate text-xs text-muted-foreground">
            {first.title} × {first.quantity}
            {rest.length > 0 && ` and ${rest.length} more`}
          </p>
        )}

        <p className="text-xs">
          {status === "open" ? (
            age && (
              <span className={cn(slow ? "font-semibold text-destructive" : "text-muted-foreground")}>
                open {age}
                {slow && ". The seller's money is still on hold."}
              </span>
            )
          ) : (
            <span className="text-muted-foreground">
              {dispute.resolution ? RESOLUTION_INFO[dispute.resolution].label : "Resolved"}
              {decided && ` · ${decided}`}
            </span>
          )}
        </p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

type DisputeQueueProps = {
  /** From the address, already checked. Open when the address names nothing. */
  status: DisputeStatus;
  page: number;
};

/** Disputes by status, oldest first, with how long each has been open. A seller's money is frozen until it is decided. */
export function DisputeQueue({ status, page }: DisputeQueueProps) {
  const queue = useDisputes({ status, page });

  return (
    <div className="grid gap-5">
      <nav aria-label="Filter disputes">
        <ul className="flex gap-2">
          {TABS.map((tab) => {
            const active = tab.status === status;

            return (
              <li key={tab.status}>
                <Link
                  href={disputesHref(tab.status)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                  {tab.status === "open" && status === "open" && queue.data && queue.data.meta.total > 0 && ` (${queue.data.meta.total})`}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {queue.isPending && <PageSkeleton label="Loading disputes" />}

      {queue.isError && (
        <Alert variant="error" title="We couldn't load the disputes">
          <Button variant="link" onClick={() => void queue.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {queue.data && queue.data.data.length === 0 && (
        <PageNotice
          icon={<FileWarning className="size-7" aria-hidden />}
          title={status === "open" ? "No open disputes" : page > 1 ? "Nothing on this page" : "Nothing here"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {status === "open"
              ? "Nobody is waiting for a decision."
              : page > 1
                ? "There are no disputes on this page."
                : "No disputes have been resolved yet."}
          </p>
          {page > 1 && (
            <Link href={disputesHref(status)} className={buttonVariants({ size: "lg" })}>
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
            {queue.data.data.map((dispute) => (
              <li key={dispute.id}>
                <Row dispute={dispute} status={status} />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={queue.data.meta.current_page}
            lastPage={queue.data.meta.last_page}
            hrefFor={(target) => disputesHref(status, target)}
          />
        </>
      )}
    </div>
  );
}