"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, FileX, Lock } from "lucide-react";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { kycPhotoUrl } from "@/lib/api/admin";
import { useApproveKyc, useKycSubmission, useRejectKyc } from "@/hooks/use-admin";
import { formatAge, formatDateTime } from "@/lib/dates";
import { applyApiErrors } from "@/lib/form-errors";
import type { AdminKycSubmission, NameMatch } from "@/lib/types/admin-kyc";
import type { KycStatus } from "@/lib/types/seller";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

const REASON_MAX = 255; // the API's limit

const rejectSchema = z.object({
  reason: z.string().trim().min(5, "Say what the seller should fix, in at least 5 characters.").max(REASON_MAX, `Keep it under ${REASON_MAX} characters.`),
});

type RejectValues = z.infer<typeof rejectSchema>;

const STATUS: Record<KycStatus, { label: string; classes: string }> = {
  none: { label: "Not started", classes: "bg-muted text-muted-foreground" },
  pending: { label: "Waiting for review", classes: "bg-info-soft text-info" },
  verified: { label: "Verified", classes: "bg-success-soft text-success" },
  rejected: { label: "Rejected", classes: "bg-danger-soft text-destructive" },
};

/** The API's `status` error ("already decided") is the most useful one when it comes. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("status") ?? error.fieldError("reason") ?? error.message;

  return "Something went wrong. Please try again.";
}

/** What the name hint means for the person deciding. It is a hint, not a rule: they look at the ID. */
function NameMatchNotice({ match, legalName }: { match: NameMatch | undefined; legalName: string }) {
  if (!match) return null;

  switch (match) {
    case "match":
      return (
        <Alert variant="success" title="The name matches">
          &ldquo;{legalName}&rdquo; fits the name the seller&apos;s bank holds for their payout account.
        </Alert>
      );

    case "partial":
      return (
        <Alert variant="warning" title="Only part of the name matches">
          &ldquo;{legalName}&rdquo; only partly fits the name the bank holds for the payout account. Compare the ID carefully (middle names and the order of names often differ).
        </Alert>
      );

    case "mismatch":
      return (
        <Alert variant="error" title="The name does not match">
          &ldquo;{legalName}&rdquo; does not fit the name the bank holds for the payout account. Don&apos;t approve unless you are sure it is the same person.
        </Alert>
      );

    case "no_bank_account":
      return (
        <Alert variant="info" title="No bank account yet">
          The seller hasn&apos;t added a payout account, so there is no name to compare with. The names must match when they add one.
        </Alert>
      );
  }
}

/** The ID photo, fetched through our proxy with the admin's login. Private and never cached, and every look is recorded. */
function IdPhoto({ id }: { id: number }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = `${kycPhotoUrl(id)}${attempt > 0 ? `?retry=${attempt}` : ""}`;

  return (
    <section aria-label="ID photo" className="grid gap-3">
      <div className="grid min-h-64 place-items-center overflow-hidden rounded-xl border border-border bg-muted p-2">
        {failed ? (
          <div className="grid justify-items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <FileX className="size-8" aria-hidden />
            <p>We couldn&apos;t load the photo.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFailed(false);
                setAttempt((count) => count + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          // The photo is private and needs the admin's login, so it cannot go through next/image, which fetches without one.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={attempt}
            src={src}
            alt="The photo of the ID the seller sent"
            onError={() => setFailed(true)}
            className="max-h-[70vh] w-full object-contain"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" aria-hidden />
          Private. Every view of this photo is recorded in the audit log.
        </p>

        {!failed && (
          <a href={src} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink aria-hidden />
            Open full size
          </a>
        )}
      </div>
    </section>
  );
}

function RejectForm({ id, legalName, onCancel }: { id: number; legalName: string; onCancel: () => void }) {
  const reject = useRejectKyc();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RejectValues>({ resolver: zodResolver(rejectSchema), defaultValues: { reason: "" } });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form;

  const length = watch("reason")?.length ?? 0;

  const submit = handleSubmit((values) => {
    setFormError(null);

    reject.mutate(
      { id, reason: values.reason },
      // A problem about the decision itself ("already decided") is not about the text, so it shows above the box.
      { onError: (error) => setFormError(error instanceof ApiError && error.fieldError("status") ? errorText(error) : applyApiErrors(error, setError, ["reason"])) },
    );
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <p className="font-semibold">Reject {legalName}&apos;s identity check?</p>

      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Reason"
        error={errors.reason?.message}
        hint="The seller reads this exactly as written, and it is how they know what to fix. For example: “The photo is too dark to read. Please send one taken in daylight.”"
      >
        {(control) => (
          <>
            <Textarea rows={3} maxLength={REASON_MAX} {...register("reason")} {...control} />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {length} / {REASON_MAX}
            </p>
          </>
        )}
      </FormField>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" variant="destructive" loading={reject.isPending}>
          Reject and tell the seller
        </Button>
        <Button type="button" variant="outline" disabled={reject.isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Approve or reject. Each is a deliberate second step, because a decision is final and the seller is told. */
function Decision({ submission }: { submission: AdminKycSubmission }) {
  const approve = useApproveKyc();
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);

  return (
    <section aria-labelledby="decision-heading" className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <h2 id="decision-heading" className="text-lg font-bold">
        Your decision
      </h2>

      {mode === null && (
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => setMode("approve")}>Approve</Button>
          <Button variant="outline" onClick={() => setMode("reject")}>
            Reject
          </Button>
        </div>
      )}

      {mode === "approve" && (
        <ConfirmPanel
          title={`Verify ${submission.legal_name}?`}
          confirmLabel="Yes, verify"
          keepLabel="Not yet"
          loading={approve.isPending}
          error={approve.isError ? errorText(approve.error) : null}
          onConfirm={() => approve.mutate({ id: submission.id })}
          onKeep={() => {
            approve.reset();
            setMode(null);
          }}
        >
          They are told straight away, and get the &ldquo;Verified seller&rdquo; badge. Once their bank account is set up, they can withdraw. A decision can&apos;t be undone.
        </ConfirmPanel>
      )}

      {mode === "reject" && <RejectForm id={submission.id} legalName={submission.legal_name} onCancel={() => setMode(null)} />}
    </section>
  );
}

export function KycReview({ id }: { id: number }) {
  const query = useKycSubmission(id);

  if (query.isPending) return <PageSkeleton label="Loading the identity check" />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <PageNotice icon={<FileX className="size-7" aria-hidden />} title="We couldn't find that identity check">
          <Link href="/admin/kyc" className={buttonVariants({ size: "lg" })}>
            All identity checks
          </Link>
        </PageNotice>
      );
    }

    return (
      <Alert variant="error" title="We couldn't load this identity check">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const submission = query.data;
  const look = STATUS[submission.status];
  const pending = submission.status === "pending";
  const age = formatAge(submission.submitted_at);
  const decided = formatDateTime(submission.reviewed_at);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link href="/admin/kyc" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          Identity checks
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{submission.legal_name}</h1>
            <p className="text-sm text-muted-foreground">
              {submission.id_type_label}
              {age && ` · sent ${age} ago`}
            </p>
          </div>

          <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold", look.classes)}>{look.label}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <IdPhoto id={submission.id} />

        <div className="grid gap-5">
          <section aria-label="The seller" className="grid gap-2 rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">The seller</h2>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Shop</dt>
              <dd className="text-right font-medium">{submission.seller.store_name ?? "No shop"}</dd>

              <dt className="text-muted-foreground">Account name</dt>
              <dd className="text-right font-medium">{submission.seller.name ?? "Unknown"}</dd>

              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-right font-medium break-all">{submission.seller.email ?? "Unknown"}</dd>

              <dt className="text-muted-foreground">Name on the ID</dt>
              <dd className="text-right font-semibold">{submission.legal_name}</dd>
            </dl>
          </section>

          <NameMatchNotice match={submission.name_match} legalName={submission.legal_name} />

          {pending ? (
            <Decision submission={submission} />
          ) : (
            <section aria-label="Decision" className="grid gap-2 rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">{submission.status === "verified" ? "Approved" : "Rejected"}</h2>
              {decided && <p className="text-sm text-muted-foreground">Decided {decided}.</p>}
              {submission.status === "rejected" && submission.rejection_reason && (
                <div className="grid gap-0.5">
                  <p className="text-xs font-semibold text-muted-foreground">What the seller was told</p>
                  <p className="text-sm break-words whitespace-pre-line">{submission.rejection_reason}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}