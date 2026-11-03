"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useOverview } from "@/hooks/use-admin";
import { formatDay, lagosDay } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** The periods to choose from. 30 days is the API's own default. */
export const PERIOD_OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;

export type PeriodDays = (typeof PERIOD_OPTIONS)[number]["days"];

/** From (days - 1) ago up to today, so "7 days" is today and the six days before it, as the API counts. */
const periodFor = (days: number) => ({ from: lagosDay(-(days - 1)), to: lagosDay(0) });

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Pending() {
  return <div className="h-8 w-28 animate-pulse rounded-md bg-muted" role="status" aria-label="Loading" />;
}

const count = (value: number) => value.toLocaleString("en-NG");

/**
 * The money position right now, and what happened in a chosen period. The "right now" numbers ignore the period:
 * they are the state of the platform, not its history. Everything is kobo from the API, shown with formatNaira.
 */
export function MoneyOverview({ days }: { days: PeriodDays }) {
  const overview = useOverview(periodFor(days));
  const data = overview.data;

  const held = data?.money_now.escrow_held ?? 0;
  const sellersShare = data?.money_now.escrow_sellers_share ?? 0;
  const sellersPercent = held > 0 ? Math.round((sellersShare / held) * 100) : 0;

  const from = data ? formatDay(data.period.from) : null;
  const to = data ? formatDay(data.period.to) : null;

  return (
    <div className="grid gap-8">
      {overview.isError && !data && (
        <Alert variant="error" title="We couldn't load the numbers">
          <Button variant="link" onClick={() => void overview.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      <section aria-labelledby="money-heading" className="grid gap-4">
        <div className="grid gap-0.5">
          <h2 id="money-heading" className="text-lg font-bold">
            Money right now
          </h2>
          <p className="text-sm text-muted-foreground">The state of the platform today, whatever period is chosen below.</p>
        </div>

        <div className="grid gap-3 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">Held in escrow (paid by buyers, not yet released)</p>
            {data ? <p className="text-3xl font-extrabold tracking-tight">{formatNaira(held)}</p> : <Pending />}
          </div>

          {data && (
            <>
              <div
                role="img"
                aria-label={`Of the money held, ${sellersPercent}% is sellers' money and ${100 - sellersPercent}% is our commission.`}
                className="flex h-3 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full bg-primary" style={{ width: `${sellersPercent}%` }} />
                <div className="h-full bg-coral" style={{ width: held > 0 ? `${100 - sellersPercent}%` : "0%" }} />
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-primary" aria-hidden />
                    Sellers&apos; share
                  </dt>
                  <dd className="font-semibold">{formatNaira(sellersShare)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2.5 rounded-full bg-coral" aria-hidden />
                    Our commission
                  </dt>
                  <dd className="font-semibold">{formatNaira(data.money_now.escrow_commission)}</dd>
                </div>
              </dl>
            </>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Owed to sellers"
            value={data ? formatNaira(data.money_now.owed_to_sellers) : <Pending />}
            hint="Released, waiting to be withdrawn"
          />
          <Stat
            label="On its way to banks"
            value={data ? formatNaira(data.money_now.payouts_in_progress_total) : <Pending />}
            hint={data ? `${count(data.money_now.payouts_in_progress_count)} ${data.money_now.payouts_in_progress_count === 1 ? "withdrawal" : "withdrawals"} in progress` : undefined}
          />
          <Stat
            label="Commission earned, all time"
            value={data ? formatNaira(data.money_now.commission_earned_all_time) : <Pending />}
            hint="Released and ours to keep"
          />
        </div>
      </section>

      <section aria-labelledby="period-heading" className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-0.5">
            <h2 id="period-heading" className="text-lg font-bold">
              Sales and growth
            </h2>
            {from && to && <p className="text-sm text-muted-foreground">{from} to {to}</p>}
          </div>

          <nav aria-label="Choose a period">
            <ul className="flex gap-2">
              {PERIOD_OPTIONS.map((option) => {
                const active = option.days === days;

                return (
                  <li key={option.days}>
                    <Link
                      href={option.days === 30 ? "/admin" : `/admin?days=${option.days}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                        active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                      )}
                    >
                      {option.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Orders paid"
            value={data ? count(data.sales.paid_orders) : <Pending />}
            hint={data ? `${formatNaira(data.sales.paid_total)} paid by buyers` : undefined}
          />
          <Stat
            label="Orders completed"
            value={data ? count(data.sales.completed_orders) : <Pending />}
            hint={data ? `${formatNaira(data.sales.completed_total)} released to sellers` : undefined}
          />
          <Stat
            label="Commission earned"
            value={data ? formatNaira(data.sales.commission_earned) : <Pending />}
            hint="Counted when the money is released"
          />
          <Stat
            label="Refunds"
            value={data ? count(data.sales.refunds_requested) : <Pending />}
            hint={data ? `${formatNaira(data.sales.refunds_requested_total)} refunded` : undefined}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="New users" value={data ? count(data.growth.new_users) : <Pending />} />
          <Stat label="New sellers" value={data ? count(data.growth.new_sellers) : <Pending />} />
        </div>
      </section>

      <section aria-labelledby="totals-heading" className="grid gap-4">
        <h2 id="totals-heading" className="text-lg font-bold">
          Totals
        </h2>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Users" value={data ? count(data.totals.users) : <Pending />} />
          <Stat label="Suspended" value={data ? count(data.totals.suspended_users) : <Pending />} />
          <Stat label="Sellers" value={data ? count(data.totals.sellers) : <Pending />} />
          <Stat label="Verified sellers" value={data ? count(data.totals.verified_sellers) : <Pending />} />
          <Stat label="Buyable listings" value={data ? count(data.totals.buyable_listings) : <Pending />} hint="Live, in stock" />
        </div>
      </section>
    </div>
  );
}