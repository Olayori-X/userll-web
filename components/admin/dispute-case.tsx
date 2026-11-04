"use client";

import Link from "next/link";
import { ArrowLeft, FileX } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useDispute } from "@/hooks/use-admin";
import { formatAge, formatDateTime } from "@/lib/dates";
import { DISPUTE_REASON_LABEL, RESOLUTION_INFO, SLOW_DISPUTE_HOURS, hoursSince } from "@/lib/dispute";
import { cn } from "@/lib/utils";
import { DisputeChat } from "@/components/admin/dispute-chat";
import { DisputeDecision } from "@/components/admin/dispute-decision";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

/** One dispute: the evidence, the conversation, and the decision. Once it is decided, the outcome replaces the decision. */
export function DisputeCase({ id }: { id: number }) {
  const query = useDispute(id);

  if (query.isPending) return <PageSkeleton label="Loading the dispute" />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <PageNotice icon={<FileX className="size-7" aria-hidden />} title="We couldn't find that dispute">
          <Link href="/admin/disputes" className={buttonVariants({ size: "lg" })}>
            All disputes
          </Link>
        </PageNotice>
      );
    }

    return (
      <Alert variant="error" title="We couldn't load this dispute">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const dispute = query.data;
  const open = dispute.status === "open";
  const order = dispute.order;
  const age = formatAge(dispute.created_at);
  const waiting = hoursSince(dispute.created_at);
  const slow = open && waiting !== null && waiting >= SLOW_DISPUTE_HOURS;
  const shipped = formatDateTime(order?.shipped_at);
  const decided = formatDateTime(dispute.resolved_at);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link href="/admin/disputes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          Disputes
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{DISPUTE_REASON_LABEL[dispute.reason]}</h1>
            <p className="text-sm text-muted-foreground">
              {order?.order_number}
              {age && ` · opened ${age} ago`}
            </p>
          </div>

          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
              open ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
            )}
          >
            {open ? "Open" : "Resolved"}
          </span>
        </div>

        {slow && <Alert variant="warning">This has been open for a while, and the seller&apos;s money is on hold until it&apos;s decided.</Alert>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="grid gap-6">
          <section aria-labelledby="said-heading" className="grid gap-3 rounded-xl border border-border bg-card p-5">
            <h2 id="said-heading" className="text-lg font-bold">
              What the buyer says
            </h2>

            {/* The buyer's own words, as plain text with their line breaks. Nothing in it can run as code. */}
            <p className="text-sm leading-relaxed break-words whitespace-pre-line">{dispute.details}</p>

            {dispute.opened_by && (
              <p className="text-xs text-muted-foreground">
                {dispute.opened_by.name} · <span className="break-all">{dispute.opened_by.email}</span>
              </p>
            )}
          </section>

          {order && <DisputeChat orderNumber={order.order_number} />}
        </div>

        <div className="grid gap-6">
          {order && (
            <section aria-labelledby="order-heading" className="grid gap-3 rounded-xl border border-border bg-card p-5">
              <h2 id="order-heading" className="text-lg font-bold">
                The order
              </h2>

              <ul className="divide-y divide-border">
                {order.items.map((item, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <p className="min-w-0 text-sm break-words">
                      {item.title} <span className="text-muted-foreground">× {item.quantity}</span>
                    </p>
                    <p className="shrink-0 text-sm font-medium">{item.unit_price_formatted}</p>
                  </li>
                ))}
              </ul>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-border pt-3 text-sm">
                <dt className="text-muted-foreground">Buyer paid</dt>
                <dd className="text-right font-semibold">{order.total_formatted}</dd>

                <dt className="text-muted-foreground">Seller</dt>
                <dd className="text-right font-medium">{order.store_name ?? "Unknown"}</dd>

                {shipped && (
                  <>
                    <dt className="text-muted-foreground">Shipped</dt>
                    <dd className="text-right font-medium">{shipped}</dd>
                  </>
                )}
              </dl>

              {order.tracking_info && (
                <div className="grid gap-1 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Tracking details the seller gave</p>
                  <p className="text-sm break-words whitespace-pre-line">{order.tracking_info}</p>
                </div>
              )}
            </section>
          )}

          {open ? (
            <DisputeDecision dispute={dispute} />
          ) : (
            <section aria-label="Outcome" className="grid gap-2 rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">Decided</h2>

              <p className="text-sm font-semibold">{dispute.resolution ? RESOLUTION_INFO[dispute.resolution].label : "Resolved"}</p>

              {dispute.resolution && <p className="text-sm text-muted-foreground">{RESOLUTION_INFO[dispute.resolution].effect}</p>}

              {decided && <p className="text-xs text-muted-foreground">{decided}</p>}

              {dispute.resolution_note && (
                <div className="grid gap-0.5 border-t border-border pt-2">
                  <p className="text-xs font-semibold text-muted-foreground">Note (admins only)</p>
                  <p className="text-sm break-words whitespace-pre-line">{dispute.resolution_note}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}