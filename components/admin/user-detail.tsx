"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, UserX } from "lucide-react";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { useReactivateUser, useSuspendUser, useUser } from "@/hooks/use-admin";
import { formatDateTime } from "@/lib/dates";
import { applyApiErrors } from "@/lib/form-errors";
import { formatNaira } from "@/lib/money";
import type { AdminUser, UserStats } from "@/lib/types/admin-users";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

const REASON_MAX = 255; // the API's limit

const suspendSchema = z.object({
  reason: z.string().trim().min(5, "Write at least 5 characters, so another admin can see why.").max(REASON_MAX, `Keep it under ${REASON_MAX} characters.`),
});

type SuspendValues = z.infer<typeof suspendSchema>;

/** The API's `user` error ("already suspended", "cannot suspend yourself") is the most useful one when it comes. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("user") ?? error.fieldError("reason") ?? error.message;

  return "Something went wrong. Please try again.";
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const count = (value: number) => value.toLocaleString("en-NG");

function BuyerStats({ stats }: { stats: UserStats["as_buyer"] }) {
  return (
    <Card title="As a buyer">
      <Facts
        rows={[
          ["Paid orders", count(stats.orders)],
          ["Completed", count(stats.completed_orders)],
          ["Disputes they opened", count(stats.disputes_opened)],
          ["Reviews they wrote", count(stats.reviews_written)],
        ]}
      />
    </Card>
  );
}

function SellerStats({ stats, userId }: { stats: NonNullable<UserStats["as_seller"]>; userId: number }) {
  const { listings } = stats;
  // Disputes against a seller mean little on their own: they mean something next to how many orders there were.
  const disputeRate = stats.orders > 0 ? Math.round((stats.disputes_against / stats.orders) * 100) : null;

  return (
    <Card title="As a seller">
      <Facts
        rows={[
          ["Listings", `${count(listings.active)} live · ${count(listings.draft)} draft · ${count(listings.sold_out)} sold out · ${count(listings.removed)} removed`],
          ["Paid orders", count(stats.orders)],
          ["Completed orders", count(stats.completed_orders)],
          ["Sales (completed)", formatNaira(stats.sales_total)],
          ["Commission paid", formatNaira(stats.commission_paid)],
          [
            "Disputes against them",
            <span key="d" className={cn(disputeRate !== null && disputeRate >= 10 && "font-semibold text-destructive")}>
              {count(stats.disputes_against)}
              {disputeRate !== null && ` of ${count(stats.orders)} orders (${disputeRate}%)`}
            </span>,
          ],
        ]}
      />

      <div className="grid gap-2 border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground">Money</p>
        <Facts
          rows={[
            ["Available to withdraw", formatNaira(stats.wallet.available)],
            ["Held until delivery", formatNaira(stats.wallet.pending)],
            ["Withdrawn so far", `${formatNaira(stats.payouts.paid_total)} (${count(stats.payouts.count)} ${stats.payouts.count === 1 ? "withdrawal" : "withdrawals"})`],
            ["On its way to a bank", formatNaira(stats.payouts.in_progress_total)],
          ]}
        />
        <Link href={`/admin/payouts?seller=${userId}`} className="text-sm font-semibold text-primary hover:underline">
          See their withdrawals
        </Link>
      </div>
    </Card>
  );
}

/** Suspend, or restore. Each asks first, and says in plain words what it does. */
function AccountControl({ user }: { user: AdminUser }) {
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const [mode, setMode] = useState<"suspend" | "reactivate" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SuspendValues>({ resolver: zodResolver(suspendSchema), defaultValues: { reason: "" } });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form;

  const length = watch("reason")?.length ?? 0;
  const suspended = user.status === "suspended";

  const submit = handleSubmit((values) => {
    setFormError(null);

    suspend.mutate(
      { id: user.id, reason: values.reason },
      {
        // A problem about the account itself ("already suspended") is not about the text, so it shows above the box.
        onError: (error) =>
          setFormError(error instanceof ApiError && error.fieldError("user") ? errorText(error) : applyApiErrors(error, setError, ["reason"])),
      },
    );
  });

  // The two accounts the API refuses to suspend. The button is not offered, so it is never a surprise.
  if (user.type === "admin") {
    return <Alert variant="info">Admin accounts can&apos;t be suspended here.</Alert>;
  }

  if (suspended) {
    return (
      <Card title="Suspended">
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">
            Since {formatDateTime(user.suspended_at) ?? "an earlier date"}. They can&apos;t log in or sell, and their listings are off the market.
          </p>
          {user.suspension_reason && (
            <p>
              <span className="font-semibold">Reason (admins only):</span> <span className="break-words">{user.suspension_reason}</span>
            </p>
          )}
        </div>

        {mode === "reactivate" ? (
          <ConfirmPanel
            title={`Let ${user.name} back in?`}
            confirmLabel="Yes, reactivate"
            keepLabel="Not yet"
            loading={reactivate.isPending}
            error={reactivate.isError ? errorText(reactivate.error) : null}
            onConfirm={() => reactivate.mutate({ id: user.id })}
            onKeep={() => {
              reactivate.reset();
              setMode(null);
            }}
          >
            They can log in and buy again{user.seller ? ", and sell again" : ""}. Their listings don&apos;t come back by themselves: a seller has to publish them again.
          </ConfirmPanel>
        ) : (
          <Button variant="outline" className="justify-self-start" onClick={() => setMode("reactivate")}>
            Reactivate account
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card title="Suspend this account">
      <p className="text-sm text-muted-foreground">
        Use this for fraud, abuse or a serious breach. It takes effect immediately, and you can reverse it later.
      </p>

      {mode === "suspend" ? (
        <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border border-border bg-muted/50 p-4">
          <p className="font-semibold">Suspend {user.name}?</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>They&apos;re logged out of every device straight away.</li>
            <li>They can&apos;t log in, buy or sell.</li>
            <li>Their listings come off the market.</li>
            <li>Orders already placed stay as they are, and money already held stays held.</li>
            <li>They&apos;re told their account was suspended, but not why.</li>
          </ul>

          {formError && <Alert variant="error">{formError}</Alert>}

          <FormField
            label="Reason"
            error={errors.reason?.message}
            hint="For the record, so another admin can see why. Only admins can read it. The person is never shown it."
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
            <Button type="submit" variant="destructive" loading={suspend.isPending}>
              Suspend account
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={suspend.isPending}
              onClick={() => {
                suspend.reset();
                setMode(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="justify-self-start text-destructive hover:bg-danger-soft hover:text-destructive" onClick={() => setMode("suspend")}>
          Suspend account
        </Button>
      )}
    </Card>
  );
}

export function UserDetail({ id }: { id: number }) {
  const query = useUser(id);

  if (query.isPending) return <PageSkeleton label="Loading the account" />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <PageNotice icon={<UserX className="size-7" aria-hidden />} title="We couldn't find that account">
          <Link href="/admin/users" className={buttonVariants({ size: "lg" })}>
            All users
          </Link>
        </PageNotice>
      );
    }

    return (
      <Alert variant="error" title="We couldn't load this account">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const user = query.data;
  const suspended = user.status === "suspended";

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          Users
        </Link>

        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={user.name} size="lg" />

          <div className="grid min-w-0 flex-1 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight break-words">{user.name}</h1>
              {suspended && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-destructive">Suspended</span>}
            </div>

            <p className="text-sm break-all text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {user.type === "admin" ? "Admin" : user.type === "seller" ? "Seller" : "Buyer"}
              {" · "}
              {user.email_verified ? "email verified" : "email not verified"}
              {" · "}joined {formatDateTime(user.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="grid gap-6">
          {user.seller && (
            <Card title="Their shop">
              <Facts
                rows={[
                  ["Shop", user.seller.store_name],
                  [
                    "Identity check",
                    user.seller.kyc_status === "verified"
                      ? "Verified"
                      : user.seller.kyc_status === "pending"
                        ? "Waiting for review"
                        : user.seller.kyc_status === "rejected"
                          ? "Turned down"
                          : "Not started",
                  ],
                  [
                    "Rating",
                    user.seller.reviews_count > 0
                      ? `${user.seller.rating_average.toFixed(1)} from ${count(user.seller.reviews_count)} ${user.seller.reviews_count === 1 ? "review" : "reviews"}`
                      : "No reviews yet",
                  ],
                ]}
              />

              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <Link href={`/sellers/${user.seller.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  <ExternalLink className="size-3.5" aria-hidden />
                  View their shop
                </Link>
                {user.seller.kyc_status !== "none" && (
                  <Link href="/admin/kyc?status=verified" className="text-sm font-semibold text-primary hover:underline">
                    Identity checks
                  </Link>
                )}
              </div>
            </Card>
          )}

          {user.stats && <BuyerStats stats={user.stats.as_buyer} />}
        </div>

        <div className="grid gap-6">
          {user.stats?.as_seller && <SellerStats stats={user.stats.as_seller} userId={user.id} />}

          <AccountControl user={user} />
        </div>
      </div>
    </div>
  );
}