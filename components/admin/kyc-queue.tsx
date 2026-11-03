"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { useKycSubmissions } from "@/hooks/use-admin";
import { formatAge, formatDay } from "@/lib/dates";
import { toQueryString } from "@/lib/query-string";
import type { AdminKycSubmission } from "@/lib/types/admin-kyc";
import type { KycStatus } from "@/lib/types/seller";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

type Tab = { status: Exclude<KycStatus, "none">; label: string };

const TABS: Tab[] = [
  { status: "pending", label: "Pending" },
  { status: "verified", label: "Verified" },
  { status: "rejected", label: "Rejected" },
];

/** A check waiting longer than this is flagged, so nobody is left waiting forever. */
const SLOW_AFTER_HOURS = 48;

const kycHref = (status: Tab["status"], page = 1) =>
  `/admin/kyc${toQueryString({ status: status === "pending" ? undefined : status, page: page > 1 ? page : undefined })}`;

function Row({ item, status }: { item: AdminKycSubmission; status: Tab["status"] }) {
  const age = formatAge(item.submitted_at);
  const hoursWaiting = (Date.now() - new Date(item.submitted_at).getTime()) / 3_600_000;
  const slow = status === "pending" && hoursWaiting >= SLOW_AFTER_HOURS;
  const decided = formatDay(item.reviewed_at);

  return (
    <Link
      href={`/admin/kyc/${item.id}`}
      className="flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
    >
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-sm font-semibold">{item.legal_name}</p>

        <p className="truncate text-xs text-muted-foreground">
          {[item.seller.store_name, item.seller.name, item.seller.email].filter(Boolean).join(" · ")}
        </p>

        <p className="text-xs text-muted-foreground">
          {item.id_type_label}
          {status === "pending" && age && (
            <>
              {" · "}
              <span className={cn(slow && "font-semibold text-destructive")}>waiting {age}</span>
            </>
          )}
          {status !== "pending" && decided && ` · decided ${decided}`}
        </p>

        {status === "rejected" && item.rejection_reason && (
          <p className="truncate text-xs text-destructive">Reason: {item.rejection_reason}</p>
        )}
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

type KycQueueProps = {
  /** From the address, already checked against the real statuses. Pending when the address names none. */
  status: Tab["status"];
  page: number;
};

/** Identity checks by status. Pending ones come oldest first, with how long each has been waiting. */
export function KycQueue({ status, page }: KycQueueProps) {
  const queue = useKycSubmissions({ status, page });

  return (
    <div className="grid gap-5">
      <nav aria-label="Filter identity checks">
        <ul className="flex gap-2">
          {TABS.map((tab) => {
            const active = tab.status === status;

            return (
              <li key={tab.status}>
                <Link
                  href={kycHref(tab.status)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                  {tab.status === "pending" && queue.data && status === "pending" && queue.data.meta.total > 0 && ` (${queue.data.meta.total})`}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {queue.isPending && <PageSkeleton label="Loading identity checks" />}

      {queue.isError && (
        <Alert variant="error" title="We couldn't load the identity checks">
          <Button variant="link" onClick={() => void queue.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {queue.data && queue.data.data.length === 0 && (
        <PageNotice
          icon={<ShieldCheck className="size-7" aria-hidden />}
          title={status === "pending" ? "All caught up" : page > 1 ? "Nothing on this page" : "Nothing here"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {status === "pending"
              ? "No identity checks are waiting for review."
              : page > 1
                ? "There are no identity checks on this page."
                : `No ${status} identity checks yet.`}
          </p>
          {page > 1 && (
            <Link href={kycHref(status)} className={buttonVariants({ size: "lg" })}>
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
            {queue.data.data.map((item) => (
              <li key={item.id}>
                <Row item={item} status={status} />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={queue.data.meta.current_page}
            lastPage={queue.data.meta.last_page}
            hrefFor={(target) => kycHref(status, target)}
          />
        </>
      )}
    </div>
  );
}