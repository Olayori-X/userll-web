"use client";

import Link from "next/link";
import { Banknote, Hourglass } from "lucide-react";
import { useWallet } from "@/hooks/use-seller-sales";
import { formatNaira } from "@/lib/money";
import type { PayoutStatus, WalletBlocker } from "@/lib/types/wallet";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Where each blocker can be sorted out. The others just need time, or a smaller number. */
const FIX: Partial<Record<WalletBlocker["code"], { href: string; label: string }>> = {
  kyc: { href: "/seller/kyc", label: "Verify your identity" },
  payout_account: { href: "#bank-account", label: "Add your bank account" },
};

/** Things the seller can fix are warnings. Things that only need patience are plain information. */
const VARIANT: Record<WalletBlocker["code"], "warning" | "info"> = {
  kyc: "warning",
  payout_account: "warning",
  account_hold: "info",
  payout_in_progress: "info",
  balance_too_low: "info",
};

const PAYOUT_STATUS_TEXT: Record<PayoutStatus, string> = {
  pending: "about to be sent",
  processing: "with the bank",
  paid: "paid",
  failed: "failed",
  reversed: "returned",
};

function Balance({ label, hint, icon: Icon, value }: { label: string; hint: string; icon: typeof Banknote; value: string | undefined }) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>

      {value !== undefined ? (
        <p className="text-3xl font-extrabold tracking-tight">{value}</p>
      ) : (
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" role="status" aria-label={`Loading ${label}`} />
      )}

      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * The seller's two balances and, when they cannot withdraw, exactly why. The reasons come from the API as a list,
 * each with a stable code and a ready sentence, so this never has to guess. Asked again every minute while in view.
 */
export function WalletOverview() {
  const wallet = useWallet();
  const data = wallet.data;

  return (
    <section aria-label="Your balances" className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Balance
          label="Available to withdraw"
          hint="From orders the buyer has confirmed"
          icon={Banknote}
          value={data ? formatNaira(data.available_balance) : undefined}
        />
        <Balance
          label="Held until delivery"
          hint="Released when the buyer confirms, or automatically"
          icon={Hourglass}
          value={data ? formatNaira(data.pending_balance) : undefined}
        />
      </div>

      {wallet.isError && !data && (
        <Alert variant="error" title="We couldn't load your balance">
          <Button variant="link" onClick={() => void wallet.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {data?.open_payout && (
        <Alert variant="info" title="A withdrawal is on its way">
          {formatNaira(data.open_payout.amount)} is {PAYOUT_STATUS_TEXT[data.open_payout.status]}. You can withdraw again once it
          arrives.
        </Alert>
      )}

      {data?.blockers
        // The "withdrawal on its way" box above already says it, in more detail.
        .filter((blocker) => blocker.code !== "payout_in_progress" || !data.open_payout)
        .map((blocker) => {
          const fix = FIX[blocker.code];

          return (
            <Alert key={blocker.code} variant={VARIANT[blocker.code]}>
              {blocker.message}{" "}
              {fix && (
                <Link href={fix.href} className="font-semibold underline">
                  {fix.label}
                </Link>
              )}
            </Alert>
          );
        })}
    </section>
  );
}