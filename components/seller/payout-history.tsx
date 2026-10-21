"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { usePayouts } from "@/hooks/use-seller-sales";
import { formatDateTime } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { toQueryString } from "@/lib/query-string";
import type { Payout, PayoutStatus } from "@/lib/types/wallet";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/listings/pagination";
import { Button } from "@/components/ui/button";

const LOOK: Record<PayoutStatus, { label: string; classes: string }> = {
  pending: { label: "About to send", classes: "bg-info-soft text-info" },
  processing: { label: "With the bank", classes: "bg-info-soft text-info" },
  paid: { label: "Paid", classes: "bg-success-soft text-success" },
  failed: { label: "Failed", classes: "bg-danger-soft text-destructive" },
  reversed: { label: "Returned", classes: "bg-danger-soft text-destructive" },
};

const walletHref = (page: number) => `/seller/wallet${toQueryString({ page: page > 1 ? page : undefined })}#history`;

function Row({ payout }: { payout: Payout }) {
  const look = LOOK[payout.status];
  const requested = formatDateTime(payout.requested_at);
  const paid = formatDateTime(payout.paid_at);
  const failed = payout.status === "failed" || payout.status === "reversed";

  return (
    <li className="grid gap-1 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <p className="text-sm font-semibold">{formatNaira(payout.net_amount)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[payout.bank_name, payout.account_number].filter(Boolean).join(" · ") || "Bank account"}
          </p>
        </div>

        <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", look.classes)}>
          {look.label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {payout.status === "paid" && paid ? `Arrived ${paid}` : requested ? `Requested ${requested}` : null}
        {` · ${formatNaira(payout.amount)} withdrawn, ${payout.fee === 0 ? "no fee" : `${formatNaira(payout.fee)} fee`}`}
      </p>

      {/* The API words the reason itself, in plain language. It never passes on the payment provider's text. */}
      {failed && payout.message && <p className="text-xs font-medium text-destructive">{payout.message}</p>}
      {failed && <p className="text-xs text-muted-foreground">The money is back in your available balance.</p>}
    </li>
  );
}

/** Every withdrawal, newest first. Re-checked every minute, so a transfer that arrives changes to "Paid" on its own. */
export function PayoutHistory({ page }: { page: number }) {
  const payouts = usePayouts(page);

  return (
    <section id="history" aria-labelledby="history-heading" className="grid scroll-mt-24 gap-3">
      <h2 id="history-heading" className="text-lg font-bold">
        Withdrawal history
      </h2>

      {payouts.isPending && (
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border" role="status">
          {[0, 1].map((index) => (
            <div key={index} className="h-[76px] animate-pulse bg-card" />
          ))}
          <span className="sr-only">Loading your withdrawals</span>
        </div>
      )}

      {payouts.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="text-muted-foreground">We couldn&apos;t load your withdrawals.</p>
          <Button variant="link" onClick={() => void payouts.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {payouts.data && payouts.data.data.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <Receipt className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">{page > 1 ? "Nothing on this page" : "No withdrawals yet"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {page > 1 ? (
              <Link href={walletHref(1)} className="font-semibold text-primary hover:underline">
                Back to the first page
              </Link>
            ) : (
              "When you withdraw, it shows up here with its status."
            )}
          </p>
        </div>
      )}

      {payouts.data && payouts.data.data.length > 0 && (
        <>
          <ul className={cn("divide-y divide-border overflow-hidden rounded-xl border border-border bg-card transition-opacity", payouts.isPlaceholderData && "opacity-60")}>
            {payouts.data.data.map((payout) => (
              <Row key={payout.id} payout={payout} />
            ))}
          </ul>

          <Pagination currentPage={payouts.data.meta.current_page} lastPage={payouts.data.meta.last_page} hrefFor={walletHref} />
        </>
      )}
    </section>
  );
}