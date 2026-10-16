"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { useCancelOrder, useConfirmOrder, useOpenDispute } from "@/hooks/use-orders";
import { formatDay } from "@/lib/dates";
import { applyApiErrors } from "@/lib/form-errors";
import { formatNaira } from "@/lib/money";
import { orderActions } from "@/lib/order-status";
import type { Order } from "@/lib/types/checkout";
import type { DisputeReason } from "@/lib/types/orders";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

const DETAILS_MAX = 2000; // the API's limit

const REASONS: { value: DisputeReason; label: string; help: string }[] = [
  { value: "not_received", label: "I haven't received it", help: "It hasn't arrived, or the seller went quiet." },
  { value: "not_as_described", label: "It's not as described", help: "It's different from the listing." },
  { value: "damaged", label: "It arrived damaged", help: "It's broken or not usable." },
  { value: "other", label: "Something else", help: "Tell us what happened." },
];

const disputeSchema = z.object({
  reason: z.enum(["not_received", "not_as_described", "damaged", "other"], { error: "Choose what went wrong." }),
  details: z
    .string()
    .trim()
    .min(10, "Please tell us a little more (at least 10 characters).")
    .max(DETAILS_MAX, `Please keep it under ${DETAILS_MAX} characters.`),
});

type DisputeValues = z.infer<typeof disputeSchema>;

/** The API's `status` error ("This order cannot be cancelled right now") is the most useful one when it comes. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("status") ?? error.message;

  return "Something went wrong. Please try again.";
}

type ConfirmPanelProps = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  keepLabel: string;
  destructive?: boolean;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onKeep: () => void;
};

/** An "are you sure?" box in the page itself, for actions that cannot be undone. */
function ConfirmPanel({ title, children, confirmLabel, keepLabel, destructive, loading, error, onConfirm, onKeep }: ConfirmPanelProps) {
  return (
    <div role="group" aria-label={title} className="grid gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2.5">
        <Button variant={destructive ? "destructive" : "default"} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="outline" disabled={loading} onClick={onKeep}>
          {keepLabel}
        </Button>
      </div>
    </div>
  );
}

function DisputeForm({ orderNumber, onClose }: { orderNumber: string; onClose: () => void }) {
  const dispute = useOpenDispute();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<DisputeValues>({
    resolver: zodResolver(disputeSchema),
    defaultValues: { details: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form;

  const submit = handleSubmit((values) => {
    setFormError(null);

    dispute.mutate(
      { orderNumber, input: values },
      { onError: (error) => setFormError(applyApiErrors(error, setError, ["reason", "details"])) },
    );
  });

  const length = watch("details")?.length ?? 0;

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-lg border border-border bg-muted/50 p-4">
      <div className="grid gap-1">
        <h3 className="font-semibold">Report a problem</h3>
        <p className="text-sm text-muted-foreground">
          This pauses the payment to the seller. We&apos;ll look into it and tell you what we decide.
        </p>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">What went wrong?</legend>

        {REASONS.map((reason) => (
          <label
            key={reason.value}
            className="flex cursor-pointer gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-accent/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
          >
            <input type="radio" value={reason.value} className="mt-0.5 size-4 shrink-0 accent-primary" {...register("reason")} />
            <span className="grid text-sm">
              <span className="font-medium">{reason.label}</span>
              <span className="text-xs text-muted-foreground">{reason.help}</span>
            </span>
          </label>
        ))}

        {errors.reason && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.reason.message}
          </p>
        )}
      </fieldset>

      <FormField label="Tell us what happened" error={errors.details?.message}>
        {(control) => (
          <>
            <Textarea
              maxLength={DETAILS_MAX}
              placeholder="Give as much detail as you can: what you expected, what you got, and when."
              {...register("details")}
              {...control}
            />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {length} / {DETAILS_MAX}
            </p>
          </>
        )}
      </FormField>

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" loading={dispute.isPending}>
          Report problem
        </Button>
        <Button type="button" variant="outline" disabled={dispute.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

type Panel = "confirm" | "cancel" | "dispute" | null;

/**
 * What the buyer can do about this order right now: confirm it arrived, cancel before it ships, or report a
 * problem. It shows only what the order's status allows (see lib/order-status.ts), and nothing at all otherwise.
 * When an action succeeds the order changes status, so this panel simply goes away.
 */
export function OrderActions({ order }: { order: Order }) {
  const actions = orderActions(order);
  const [open, setOpen] = useState<Panel>(null);
  const confirm = useConfirmOrder();
  const cancel = useCancelOrder();

  if (!actions.canConfirm && !actions.canCancel && !actions.canReportProblem) return null;

  const releaseDay = formatDay(order.auto_release_at);

  function show(panel: Panel) {
    confirm.reset();
    cancel.reset();
    setOpen(panel);
  }

  return (
    <section aria-label="Order actions" className="grid gap-4 rounded-xl border border-border bg-card p-5">
      {actions.canConfirm && (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-bold">Received your order?</h2>
            <p className="text-sm text-muted-foreground">
              Confirming pays the seller. Only confirm once everything has arrived and is as described.
            </p>
            {releaseDay && (
              <p className="text-sm text-muted-foreground">
                If you don&apos;t confirm or report a problem, we&apos;ll pay the seller automatically on{" "}
                <span className="font-semibold text-foreground">{releaseDay}</span>.
              </p>
            )}
          </div>

          {open === "confirm" && (
            <ConfirmPanel
              title="Confirm that you received it?"
              confirmLabel="Yes, I received it"
              keepLabel="Not yet"
              loading={confirm.isPending}
              error={confirm.isError ? errorText(confirm.error) : null}
              onConfirm={() => confirm.mutate({ orderNumber: order.order_number })}
              onKeep={() => show(null)}
            >
              This pays the seller {formatNaira(order.total)} and can&apos;t be undone.
            </ConfirmPanel>
          )}

          {open === "dispute" && actions.canReportProblem && (
            <DisputeForm orderNumber={order.order_number} onClose={() => show(null)} />
          )}

          {open !== "confirm" && open !== "dispute" && (
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={() => show("confirm")}>I received my order</Button>
              {actions.canReportProblem && (
                <Button variant="outline" onClick={() => show("dispute")}>
                  Report a problem
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {actions.canCancel && (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-bold">Changed your mind?</h2>
            <p className="text-sm text-muted-foreground">
              You can cancel until the seller ships it, and get your full {formatNaira(order.total)} back.
            </p>
          </div>

          {open === "cancel" ? (
            <ConfirmPanel
              title="Cancel this order?"
              confirmLabel="Yes, cancel and refund"
              keepLabel="Keep my order"
              destructive
              loading={cancel.isPending}
              error={cancel.isError ? errorText(cancel.error) : null}
              onConfirm={() => cancel.mutate({ orderNumber: order.order_number })}
              onKeep={() => show(null)}
            >
              You&apos;ll be refunded in full, and the items go back on sale. A refund can take a few days to show in your
              account.
            </ConfirmPanel>
          ) : (
            <div className={cn("flex flex-wrap gap-2.5")}>
              <Button variant="outline" onClick={() => show("cancel")}>
                Cancel order
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}