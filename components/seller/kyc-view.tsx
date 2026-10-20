"use client";

import Link from "next/link";
import { Clock, ShieldCheck, TriangleAlert } from "lucide-react";
import { useKyc, usePayoutAccount } from "@/hooks/use-seller";
import { formatDateTime } from "@/lib/dates";
import type { KycStatus, KycSubmission } from "@/lib/types/seller";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/layout/require-verified-user";
import { KycForm } from "@/components/seller/kyc-form";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

const STATUS_LOOK: Record<KycStatus, { label: string; classes: string }> = {
  none: { label: "Not started", classes: "bg-muted text-muted-foreground" },
  pending: { label: "Under review", classes: "bg-info-soft text-info" },
  verified: { label: "Verified", classes: "bg-success-soft text-success" },
  rejected: { label: "Turned down", classes: "bg-danger-soft text-destructive" },
};

function StatusPill({ status }: { status: KycStatus }) {
  const look = STATUS_LOOK[status];

  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", look.classes)}>{look.label}</span>;
}

function HistoryList({ history }: { history: KycSubmission[] }) {
  if (history.length === 0) return null;

  return (
    <section aria-labelledby="history-heading" className="grid gap-3">
      <h2 id="history-heading" className="text-lg font-bold">
        Your submissions
      </h2>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {history.map((item) => (
          <li key={item.id} className="grid gap-1 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{item.id_type_label}</p>
              <StatusPill status={item.status} />
            </div>

            <p className="text-xs text-muted-foreground">
              {item.legal_name} · sent {formatDateTime(item.submitted_at) ?? "recently"}
              {item.reviewed_at && ` · decided ${formatDateTime(item.reviewed_at)}`}
            </p>

            {item.status === "rejected" && item.rejection_reason && (
              <p className="text-xs font-medium text-destructive">Reason: {item.rejection_reason}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The identity check: where the seller stands, and a form when they may send one. It needs nothing to list and sell,
 * only to withdraw, so the page says so. The status is asked again every minute while it is under review, so an
 * admin's decision shows up on its own.
 */
export function KycView() {
  const kyc = useKyc();
  const account = usePayoutAccount();

  if (kyc.isPending) return <PageSkeleton label="Loading your verification" />;

  if (kyc.isError || !kyc.data) {
    return (
      <Alert variant="error" title="We couldn't load your verification">
        <Button variant="link" onClick={() => void kyc.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const { status, latest, history, can_submit: canSubmit, id_types: idTypes } = kyc.data;
  const noBank = account.data === null;

  return (
    <div className="grid gap-8">
      {status === "verified" && (
        <div className="flex gap-4 rounded-xl border border-success/30 bg-success-soft p-5">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
          <div className="grid gap-1">
            <h2 className="text-lg font-bold text-success">You&apos;re verified</h2>
            <p className="text-sm">
              Your identity is confirmed{kyc.data.verified_at ? ` (${formatDateTime(kyc.data.verified_at)})` : ""}. Buyers see a
              &ldquo;Verified seller&rdquo; badge on your shop and your listings.
            </p>
            {noBank && (
              <p className="text-sm">
                One step left before you can withdraw:{" "}
                <Link href="/seller/wallet#bank-account" className="font-semibold underline">
                  add your bank account
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      )}

      {status === "pending" && (
        <div className="flex gap-4 rounded-xl border border-info/30 bg-info-soft p-5">
          <Clock className="mt-0.5 size-6 shrink-0 text-info" aria-hidden />
          <div className="grid gap-1">
            <h2 className="text-lg font-bold text-info">We&apos;re reviewing your ID</h2>
            <p className="text-sm">
              {latest ? `You sent your ${latest.id_type_label} on ${formatDateTime(latest.submitted_at) ?? "recently"}. ` : ""}
              We&apos;ll message you as soon as it&apos;s decided. You can keep selling in the meantime.
            </p>
          </div>
        </div>
      )}

      {status === "rejected" && (
        <div className="flex gap-4 rounded-xl border border-destructive/30 bg-danger-soft p-5">
          <TriangleAlert className="mt-0.5 size-6 shrink-0 text-destructive" aria-hidden />
          <div className="grid gap-1">
            <h2 className="text-lg font-bold text-destructive">We couldn&apos;t verify that ID</h2>
            <p className="text-sm">{latest?.rejection_reason ?? "The photo wasn't clear enough to read."}</p>
            <p className="text-sm">Send a clearer photo below and we&apos;ll look again.</p>
          </div>
        </div>
      )}

      {canSubmit && (
        <section aria-labelledby="send-heading" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-1">
            <h2 id="send-heading" className="text-lg font-bold">
              {status === "rejected" ? "Send it again" : "Verify your identity"}
            </h2>
            <p className="text-sm text-muted-foreground">
              We ask this once, so we know who is being paid. You can list and sell without it. You&apos;ll need it before your first
              withdrawal.
            </p>
          </div>

          <KycForm idTypes={idTypes} />
        </section>
      )}

      {!canSubmit && status === "none" && (
        <Alert variant="info">You can&apos;t send an identity check right now. Please try again in a moment.</Alert>
      )}

      <HistoryList history={history} />

      {status !== "verified" && (
        <p className="text-sm text-muted-foreground">
          Questions about verification?{" "}
          <Link href="/messages" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}>
            Check your messages
          </Link>{" "}
          for anything we&apos;ve sent you.
        </p>
      )}
    </div>
  );
}