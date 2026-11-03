"use client";

import Link from "next/link";
import { CheckCircle2, FileWarning, ReceiptText, ShieldCheck, Undo2, Banknote, type LucideIcon } from "lucide-react";
import { useOverview } from "@/hooks/use-admin";
import type { AdminOverview } from "@/lib/types/admin-overview";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Queue = {
  key: keyof AdminOverview["needs_attention"];
  label: string;
  /** What it means, and what the person should do. */
  hint: string;
  href: string;
  icon: LucideIcon;
};

/** The five queues waiting for a person, in the order that matters: money and people first. */
const QUEUES: Queue[] = [
  {
    key: "payments_needing_refund",
    label: "Payments to refund",
    hint: "Buyers paid, but the order couldn't go ahead. Refund them.",
    href: "/admin/payments?status=needs_refund",
    icon: ReceiptText,
  },
  {
    key: "open_disputes",
    label: "Open disputes",
    hint: "A buyer reported a problem. The seller's money is on hold.",
    href: "/admin/disputes",
    icon: FileWarning,
  },
  {
    key: "pending_kyc",
    label: "Identity checks",
    hint: "Sellers waiting to be verified before they can withdraw.",
    href: "/admin/kyc?status=pending",
    icon: ShieldCheck,
  },
  {
    key: "failed_refunds",
    label: "Refunds needing attention",
    hint: "A refund failed, or the payment provider flagged it.",
    href: "/admin/refunds?status=failed",
    icon: Undo2,
  },
  {
    key: "payouts_returned_last_7_days",
    label: "Payouts returned",
    hint: "In the last 7 days a withdrawal failed or came back.",
    href: "/admin/payouts?status=failed",
    icon: Banknote,
  },
];

function QueueCard({ queue, count }: { queue: Queue; count: number }) {
  const Icon = queue.icon;
  const waiting = count > 0;

  return (
    <Link
      href={queue.href}
      className={cn(
        "grid gap-2 rounded-xl border bg-card p-4 outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40",
        waiting ? "border-warning/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{queue.label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-full", waiting ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
          {waiting ? <Icon className="size-4" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
        </span>
      </div>

      <p className={cn("text-3xl font-extrabold tracking-tight", !waiting && "text-muted-foreground")}>{count}</p>

      <p className="text-xs text-muted-foreground">{waiting ? queue.hint : "Nothing waiting."}</p>
    </Link>
  );
}

/**
 * What is waiting for a person right now, as cards that link straight to each queue. It ignores the date range: these
 * are not "what happened", they are "what needs doing". The first thing an admin should see, so it comes first.
 */
export function NeedsAttention() {
  const overview = useOverview();
  const data = overview.data?.needs_attention;

  const waitingTotal = data ? QUEUES.reduce((sum, queue) => sum + data[queue.key], 0) : 0;

  return (
    <section aria-labelledby="attention-heading" className="grid gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="attention-heading" className="text-lg font-bold">
          Needs attention
        </h2>
        {data && (
          <p className="text-sm text-muted-foreground">{waitingTotal === 0 ? "All clear" : `${waitingTotal} waiting`}</p>
        )}
      </div>

      {overview.isPending && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
          <span className="sr-only">Loading what needs attention</span>
        </div>
      )}

      {overview.isError && !data && (
        <Alert variant="error" title="We couldn't load the numbers">
          <Button variant="link" onClick={() => void overview.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {data && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUEUES.map((queue) => (
            <li key={queue.key}>
              <QueueCard queue={queue} count={data[queue.key]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}