"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { ApiError } from "@/lib/api";
import { usePayoutQuote, useRequestPayout, useWallet } from "@/hooks/use-seller-sales";
import { formatNaira, koboToNairaInput, nairaToKobo } from "@/lib/money";
import type { Payout } from "@/lib/types/wallet";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

/** The API's own message is the right one: a field error on `amount`, or the blocker's sentence. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("amount") ?? error.message;

  return "Something went wrong. Please try again.";
}

/**
 * Withdraw to the bank account. The seller types NAIRA; everything sent to and read from the API is KOBO, converted
 * only here with the money helpers. It shows the fee and what reaches the bank before asking, asks once more
 * before sending, and is never repeated automatically: a failed request shows its reason and the seller decides.
 */
export function WithdrawForm() {
  const wallet = useWallet();
  const payout = useRequestPayout();

  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<Payout | null>(null);

  const data = wallet.data;
  const entered = text.trim() === "" ? null : nairaToKobo(text);

  // What is wrong with the amount typed, if anything. Nothing is said until something is typed.
  const problem = useMemo(() => {
    if (!data || text.trim() === "") return null;
    if (entered === null) return "Enter an amount in naira, for example 50000 or 12500.50.";
    if (entered < data.min_payout) return `The smallest withdrawal is ${formatNaira(data.min_payout)}.`;
    if (entered > data.available_balance) return `That's more than you have available (${formatNaira(data.available_balance)}).`;

    return null;
  }, [data, entered, text]);

  const validKobo = entered !== null && !problem ? entered : null;

  // Ask for the fee only once the typing pauses, so a quote is not requested for every digit.
  const [quoteFor, setQuoteFor] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuoteFor(validKobo), 400);

    return () => clearTimeout(timer);
  }, [validKobo]);

  const quote = usePayoutQuote(quoteFor);
  // The quote on screen is only ever for the amount that is on screen.
  const shownQuote = quote.data && quote.data.amount === validKobo ? quote.data : null;

  if (wallet.isPending) return <div className="h-48 animate-pulse rounded-xl bg-muted" role="status" aria-label="Loading withdrawals" />;

  if (!data) return null; // the balances above already say the wallet could not load

  const account = data.payout_account;

  return (
    <section aria-labelledby="withdraw-heading" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
          <ArrowDownToLine className="size-4" aria-hidden />
        </span>
        <h2 id="withdraw-heading" className="text-lg font-bold">
          Withdraw
        </h2>
      </div>

      {sent && (
        <Alert variant="success" title="Your withdrawal is on its way">
          {formatNaira(sent.net_amount)} is heading to {sent.bank_name ?? "your bank"} {sent.account_number ?? ""}. It can take a little
          while to arrive, and we&apos;ll message you when it does.
        </Alert>
      )}

      {!data.can_withdraw ? (
        <p className="text-sm text-muted-foreground">
          You can&apos;t withdraw just yet. The notices above say what&apos;s needed. Once they&apos;re sorted out, you can withdraw
          here.
        </p>
      ) : (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            You have <span className="font-semibold text-foreground">{formatNaira(data.available_balance)}</span> available. The smallest
            withdrawal is {formatNaira(data.min_payout)}.
          </p>

          <FormField label="Amount to withdraw" error={problem ?? undefined}>
            {(control) => (
              <div className="grid gap-2">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₦</span>
                  <Input
                    inputMode="decimal"
                    autoComplete="off"
                    maxLength={14}
                    placeholder="0"
                    className="pl-8"
                    value={text}
                    onChange={(event) => {
                      setText(event.target.value);
                      setConfirming(false);
                      payout.reset();
                      setSent(null);
                    }}
                    {...control}
                  />
                </div>

                <Button
                  type="button"
                  variant="link"
                  className="justify-self-start"
                  onClick={() => {
                    setText(koboToNairaInput(data.available_balance));
                    setConfirming(false);
                    setSent(null);
                  }}
                >
                  Withdraw everything
                </Button>
              </div>
            )}
          </FormField>

          {validKobo !== null && (
            <div aria-live="polite" className="grid gap-2 rounded-lg border border-border bg-muted/50 p-4 text-sm">
              {shownQuote ? (
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
                  <dt className="text-muted-foreground">You withdraw</dt>
                  <dd className="text-right font-medium">{formatNaira(shownQuote.amount)}</dd>

                  <dt className="text-muted-foreground">Transfer fee</dt>
                  <dd className="text-right font-medium text-muted-foreground">− {formatNaira(shownQuote.fee)}</dd>

                  <dt className="border-t border-border pt-2 font-bold">Arrives in your bank</dt>
                  <dd className="border-t border-border pt-2 text-right text-base font-extrabold">{formatNaira(shownQuote.net)}</dd>
                </dl>
              ) : quote.isError ? (
                <p className="text-muted-foreground">We couldn&apos;t work out the fee just now. You can still withdraw: the fee is shown before anything is sent.</p>
              ) : (
                <p className="text-muted-foreground">Working out the fee…</p>
              )}

              {account && (
                <p className="text-xs text-muted-foreground">
                  To {account.account_name} · {account.bank_name} · {account.account_number}
                </p>
              )}
            </div>
          )}

          {confirming && validKobo !== null ? (
            <ConfirmPanel
              title={`Withdraw ${formatNaira(validKobo)}?`}
              confirmLabel="Yes, withdraw"
              keepLabel="Not yet"
              loading={payout.isPending}
              error={payout.isError ? errorText(payout.error) : null}
              onConfirm={() =>
                payout.mutate(validKobo, {
                  onSuccess: (done) => {
                    setSent(done);
                    setText("");
                    setConfirming(false);
                  },
                })
              }
              onKeep={() => {
                payout.reset();
                setConfirming(false);
              }}
            >
              {shownQuote ? `${formatNaira(shownQuote.net)} will be sent to your bank, after the ${formatNaira(shownQuote.fee)} transfer fee. ` : ""}
              This can&apos;t be undone, and you can only have one withdrawal on its way at a time.
            </ConfirmPanel>
          ) : (
            <Button className="justify-self-start" disabled={validKobo === null} onClick={() => setConfirming(true)}>
              Withdraw{validKobo !== null ? ` ${formatNaira(validKobo)}` : ""}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}