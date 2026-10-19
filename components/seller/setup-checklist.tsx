"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useKyc, usePayoutAccount } from "@/hooks/use-seller";
import { useSellerListingCount } from "@/hooks/use-seller-listings";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type Step = {
  key: string;
  title: string;
  text: string;
  done: boolean;
  action?: { href: string; label: string };
  /** A short line shown even when the step is done, for something worth knowing. */
  note?: string;
};

/**
 * "Get your shop ready": opening the shop, a first product, the identity check and the bank account.
 * It tells the truth about what is needed when: selling works straight away, and only withdrawing needs the last two.
 * It disappears once everything is done. If any of its data cannot be loaded it stays out of the way, since
 * a missing checklist costs nothing and a wrong one would mislead.
 */
export function SetupChecklist() {
  const kyc = useKyc();
  const account = usePayoutAccount();
  const listings = useSellerListingCount();

  if (kyc.isPending || account.isPending || listings.isPending) {
    return <div className="h-56 animate-pulse rounded-xl bg-muted" role="status" aria-label="Loading your checklist" />;
  }

  if (kyc.isError || account.isError || !kyc.data || listings.count === undefined) return null;

  const kycStatus = kyc.data.status;
  const bank = account.data;
  const heldUntil = bank?.payouts_held_until ? formatDateTime(bank.payouts_held_until) : null;

  const kycText =
    kycStatus === "pending"
      ? "We're reviewing it. We'll tell you the moment it's decided."
      : kycStatus === "rejected"
        ? kyc.data.latest?.rejection_reason
          ? `It was turned down: ${kyc.data.latest.rejection_reason}`
          : "It was turned down. Send a clearer photo of your ID."
        : "Needed before your first withdrawal. Use the name exactly as it's on your ID: it must match the name on your bank account.";

  const steps: Step[] = [
    { key: "shop", title: "Open your shop", text: "", done: true },
    {
      key: "product",
      title: "Add your first product",
      text: "Add photos, a price and your delivery fee, then publish it. You can start selling right away.",
      done: listings.count > 0,
      action: { href: "/seller/listings/new", label: "Add a product" },
    },
    {
      key: "kyc",
      title: "Verify your identity",
      text: kycText,
      done: kycStatus === "verified",
      action:
        kycStatus === "pending" || kycStatus === "verified"
          ? undefined
          : { href: "/seller/kyc", label: kycStatus === "rejected" ? "Try again" : "Verify now" },
      note: kycStatus === "pending" ? "Under review" : undefined,
    },
    {
      key: "bank",
      title: "Add your bank account",
      text: "Where your money is sent when you withdraw. The account must be in your own name.",
      done: bank?.is_verified === true,
      action: { href: "/seller/wallet#bank-account", label: "Add bank account" },
      note: bank?.is_verified && heldUntil ? `New accounts pause withdrawals for a day. Withdrawals open ${heldUntil}.` : undefined,
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;

  if (doneCount === steps.length && !steps.some((step) => step.note)) return null;

  return (
    <section aria-labelledby="checklist-heading" className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="checklist-heading" className="text-lg font-bold">
            Get your shop ready
          </h2>
          <p className="text-sm text-muted-foreground">
            {doneCount} of {steps.length} done
          </p>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={doneCount}
          aria-label="Setup progress"
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>

      <ol className="grid gap-4">
        {steps.map((step) => (
          <li key={step.key} className="flex gap-3">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                step.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
              )}
            >
              {step.done && <Check className="size-3.5" />}
            </span>

            <div className="grid min-w-0 flex-1 gap-1.5">
              <p className={cn("text-sm font-semibold", step.done && "text-muted-foreground line-through decoration-1")}>
                {step.title}
                <span className="sr-only">{step.done ? " (done)" : " (to do)"}</span>
              </p>

              {!step.done && step.text && <p className="text-sm text-muted-foreground">{step.text}</p>}
              {step.note && <p className="text-xs font-medium text-info">{step.note}</p>}

              {!step.done && step.action && (
                <Link href={step.action.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "justify-self-start")}>
                  {step.action.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}