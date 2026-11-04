"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { useResolveDispute } from "@/hooks/use-admin";
import { RESOLUTION_INFO } from "@/lib/dispute";
import { applyApiErrors } from "@/lib/form-errors";
import type { AdminDispute, DisputeResolution } from "@/lib/types/admin-disputes";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

const NOTE_MAX = 1000; // the API's limit

const noteSchema = z.object({
  note: z.string().trim().max(NOTE_MAX, `Please keep it under ${NOTE_MAX} characters.`),
});

type NoteValues = z.infer<typeof noteSchema>;

const CHOICES: DisputeResolution[] = ["release", "refund"];

/** The API's `dispute` error ("already resolved") is the most useful one when it comes. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("dispute") ?? error.fieldError("resolution") ?? error.message;

  return "Something went wrong. Please try again.";
}

/**
 * Decides who gets the money. Two steps on purpose: choose, then confirm, with what will happen written out in plain words
 * both times. A decision is final, moves real money, and tells the buyer and the seller.
 */
export function DisputeDecision({ dispute }: { dispute: AdminDispute }) {
  const resolve = useResolveDispute();
  const [choice, setChoice] = useState<DisputeResolution | null>(null);
  const [confirming, setConfirming] = useState(false);

  const form = useForm<NoteValues>({ resolver: zodResolver(noteSchema), defaultValues: { note: "" } });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const length = watch("note")?.length ?? 0;
  const total = dispute.order?.total_formatted;

  const decide = handleSubmit((values) => {
    if (!choice) return;

    resolve.mutate({ id: dispute.id, resolution: choice, note: values.note || undefined });
  });

  return (
    <section aria-labelledby="decision-heading" className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-0.5">
        <h2 id="decision-heading" className="text-lg font-bold">
          Your decision
        </h2>
        <p className="text-sm text-muted-foreground">
          Read what the buyer wrote and the conversation first. A decision can&apos;t be undone, and both people are told.
        </p>
      </div>

      <fieldset className="grid gap-2" disabled={resolve.isPending}>
        <legend className="sr-only">Who gets the money</legend>

        {CHOICES.map((option) => {
          const info = RESOLUTION_INFO[option];

          return (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                choice === option ? "border-primary bg-accent/40" : "border-border bg-card hover:border-primary/50",
              )}
            >
              <input
                type="radio"
                name="resolution"
                value={option}
                checked={choice === option}
                onChange={() => {
                  setChoice(option);
                  setConfirming(false);
                  resolve.reset();
                }}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span className="grid text-sm">
                <span className="font-semibold">{info.label}</span>
                <span className="text-xs text-muted-foreground">{info.effect}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <FormField
        label="Note"
        optional
        error={errors.note?.message}
        hint="For the record: why you decided this way. Only admins can read it. The buyer and the seller are not shown it."
      >
        {(control) => (
          <>
            <Textarea rows={3} maxLength={NOTE_MAX} disabled={resolve.isPending} {...register("note")} {...control} />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {length} / {NOTE_MAX}
            </p>
          </>
        )}
      </FormField>

      {choice && confirming ? (
        <ConfirmPanel
          title={choice === "release" ? "Pay the seller?" : `Refund the buyer${total ? ` ${total}` : ""}?`}
          confirmLabel={choice === "release" ? "Yes, pay the seller" : "Yes, refund the buyer"}
          keepLabel="Not yet"
          destructive={choice === "refund"}
          loading={resolve.isPending}
          error={resolve.isError ? errorText(resolve.error) : null}
          onConfirm={() => void decide()}
          onKeep={() => {
            resolve.reset();
            setConfirming(false);
          }}
        >
          {RESOLUTION_INFO[choice].effect} The buyer and the seller are told straight away. This can&apos;t be undone.
        </ConfirmPanel>
      ) : (
        <Button className="justify-self-start" disabled={!choice} onClick={() => setConfirming(true)}>
          {choice ? `Continue: ${RESOLUTION_INFO[choice].label.toLowerCase()}` : "Choose a decision"}
        </Button>
      )}
    </section>
  );
}