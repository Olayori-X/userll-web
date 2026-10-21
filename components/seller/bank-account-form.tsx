"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Landmark } from "lucide-react";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { useBanks, usePayoutAccount, useSavePayoutAccount } from "@/hooks/use-seller";
import { formatDateTime } from "@/lib/dates";
import { applyApiErrors } from "@/lib/form-errors";
import type { PayoutAccount } from "@/lib/types/seller";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

const bankSchema = z.object({
  bank_code: z.string().min(1, "Choose your bank."),
  account_number: z
    .string()
    .trim()
    .refine((value) => /^[0-9]{10}$/.test(value.replace(/\s/g, "")), "Enter the 10-digit account number."),
});

type BankValues = z.infer<typeof bankSchema>;

const FIELDS = ["bank_code", "account_number"] as const;

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 " +
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm";

function AccountCard({ account }: { account: PayoutAccount }) {
  const held = account.payouts_held_until ? formatDateTime(account.payouts_held_until) : null;

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{account.account_name}</p>
        {account.is_verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
            <CircleCheck className="size-3" aria-hidden />
            Confirmed by the bank
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {account.bank_name} · {account.account_number}
      </p>

      {held && (
        <p className="text-xs font-medium text-info">
          For your protection, withdrawals to a new account open at {held}.
        </p>
      )}
    </div>
  );
}

function BankForm({ onDone, onCancel }: { onDone: (account: PayoutAccount) => void; onCancel?: () => void }) {
  const banks = useBanks();
  const save = useSavePayoutAccount();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<BankValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: { bank_code: "", account_number: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const submit = handleSubmit((values) => {
    setFormError(null);

    save.mutate(
      { bankCode: values.bank_code, accountNumber: values.account_number.replace(/\s/g, "") },
      {
        onSuccess: onDone,
        onError: (error) => {
          // A 502 means the bank could not be reached: nothing was saved, so say so plainly.
          setFormError(
            error instanceof ApiError && error.status >= 500
              ? "We couldn't reach the bank just now. Nothing was saved, so please try again in a moment."
              : applyApiErrors(error, setError, FIELDS),
          );
        },
      },
    );
  });

  if (banks.isPending) return <div className="h-40 animate-pulse rounded-lg bg-muted" role="status" aria-label="Loading banks" />;

  if (banks.isError || !banks.data) {
    return (
      <Alert variant="error" title="We couldn't load the list of banks">
        <Button variant="link" onClick={() => void banks.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField label="Bank" error={errors.bank_code?.message}>
        {(control) => (
          <select className={SELECT_CLASS} {...register("bank_code")} {...control}>
            <option value="">Choose your bank</option>
            {banks.data.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField
        label="Account number"
        error={errors.account_number?.message}
        hint="10 digits. The bank tells us whose account it is, and it must be in your own name."
      >
        {(control) => (
          <Input
            inputMode="numeric"
            autoComplete="off"
            maxLength={13} // 10 digits, with room for spaces
            placeholder="0123456789"
            {...register("account_number")}
            {...control}
          />
        )}
      </FormField>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" loading={save.isPending}>
          Check and save
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={save.isPending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/** The seller's bank account: what is saved, and a form to set or change it. The wallet's "Add your bank account" links here. */
export function BankAccountSection() {
  const account = usePayoutAccount();
  const [changing, setChanging] = useState(false);
  const [confirmed, setConfirmed] = useState<PayoutAccount | null>(null);

  const saved = account.data;

  return (
    <section id="bank-account" aria-labelledby="bank-heading" className="grid scroll-mt-24 gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
          <Landmark className="size-4" aria-hidden />
        </span>
        <h2 id="bank-heading" className="text-lg font-bold">
          Bank account
        </h2>
      </div>

      {account.isPending && <div className="h-24 animate-pulse rounded-lg bg-muted" role="status" aria-label="Loading your bank account" />}

      {account.isError && (
        <Alert variant="error" title="We couldn't load your bank account">
          <Button variant="link" onClick={() => void account.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {confirmed && (
        <Alert variant="success" title="Account confirmed">
          The bank says this account belongs to {confirmed.account_name} at {confirmed.bank_name}.
        </Alert>
      )}

      {saved && <AccountCard account={saved} />}

      {saved && !changing && (
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-self-start"
            onClick={() => {
              setConfirmed(null);
              setChanging(true);
            }}
          >
            Change account
          </Button>
          <p className="text-xs text-muted-foreground">Changing your account pauses withdrawals again for a short while, for your protection.</p>
        </div>
      )}

      {saved === null && (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Where your money is sent when you withdraw. The account must be in your own name, the same as on your ID.
          </p>
          <BankForm onDone={setConfirmed} />
        </div>
      )}

      {saved && changing && (
        <div className="grid gap-4 border-t border-border pt-4">
          <p className="text-sm font-semibold">New account</p>
          <BankForm
            onDone={(next) => {
              setConfirmed(next);
              setChanging(false);
            }}
            onCancel={() => setChanging(false)}
          />
        </div>
      )}
    </section>
  );
}