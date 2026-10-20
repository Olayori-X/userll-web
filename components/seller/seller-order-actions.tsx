"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { useCancelSellerOrder, useShipOrder } from "@/hooks/use-seller-sales";
import { applyApiErrors } from "@/lib/form-errors";
import { formatNaira } from "@/lib/money";
import { sellerOrderActions, shipDeadline } from "@/lib/order-status";
import type { SellerOrder } from "@/lib/types/seller-orders";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

const TRACKING_MAX = 500; // the API's limit

const shipSchema = z.object({
  tracking_info: z
    .string()
    .trim()
    .min(3, "Please add the tracking details, at least 3 characters.")
    .max(TRACKING_MAX, `Please keep it under ${TRACKING_MAX} characters.`),
});

type ShipValues = z.infer<typeof shipSchema>;

/** The API's `status` error ("This order cannot be shipped right now") is the most useful one when it comes. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.fieldError("status") ?? error.message;

  return "Something went wrong. Please try again.";
}

function ShipForm({ order }: { order: SellerOrder }) {
  const ship = useShipOrder();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ShipValues>({
    resolver: zodResolver(shipSchema),
    defaultValues: { tracking_info: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form;

  const length = watch("tracking_info")?.length ?? 0;

  const submit = handleSubmit((values) => {
    setFormError(null);

    ship.mutate(
      { orderNumber: order.order_number, trackingInfo: values.tracking_info },
      {
        onError: (error) => {
          // "tracking_info" problems go under the box. A `status` problem (the buyer just cancelled) goes above it.
          const banner = applyApiErrors(error, setError, ["tracking_info"]);

          setFormError(error instanceof ApiError && error.fieldError("status") ? errorText(error) : banner);
        },
      },
    );
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Tracking details"
        error={errors.tracking_info?.message}
        hint="The courier and tracking number, or the rider's name and phone number. The buyer sees exactly this."
      >
        {(control) => (
          <>
            <Textarea
              rows={3}
              maxLength={TRACKING_MAX}
              placeholder={"GIG Logistics, tracking number 123456789\nor: Rider Musa, 0801 234 5678"}
              {...register("tracking_info")}
              {...control}
            />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {length} / {TRACKING_MAX}
            </p>
          </>
        )}
      </FormField>

      <Button type="submit" className="justify-self-start" loading={ship.isPending}>
        Mark as shipped
      </Button>
    </form>
  );
}

/**
 * What the seller can do about an order right now. Only an order waiting to be shipped can be shipped or cancelled:
 * after that it is up to the buyer, an admin, or the automatic release, so nothing is shown. When an action
 * succeeds the order changes status and this panel simply goes away.
 */
export function SellerOrderActions({ order }: { order: SellerOrder }) {
  const { canShip, canCancel } = sellerOrderActions(order);
  const [cancelling, setCancelling] = useState(false);
  const cancel = useCancelSellerOrder();

  if (!canShip && !canCancel) return null;

  const deadline = shipDeadline(order);

  return (
    <section aria-label="Order actions" className="grid gap-5 rounded-xl border border-border bg-card p-5">
      {canShip && (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-bold">Ship this order</h2>
            <p className="text-sm text-muted-foreground">
              Hand it over, then add the tracking details. The buyer is told straight away, and you&apos;re paid when they confirm they
              received it, or automatically if they don&apos;t.
            </p>
            {deadline && (
              <p className={cn("text-sm font-semibold", deadline.urgent ? "text-destructive" : "text-warning")}>{deadline.text}</p>
            )}
            <p className="text-xs text-muted-foreground">If the deadline passes without shipping, the order is cancelled and the buyer is refunded.</p>
          </div>

          <ShipForm order={order} />
        </div>
      )}

      {canCancel && (
        <div className={cn("grid gap-3", canShip && "border-t border-border pt-5")}>
          <div className="grid gap-1">
            <h2 className="text-base font-bold">Can&apos;t fulfil this order?</h2>
            <p className="text-sm text-muted-foreground">You can cancel until you ship it. The buyer is refunded in full.</p>
          </div>

          {cancelling ? (
            <ConfirmPanel
              title="Cancel this order?"
              confirmLabel="Yes, cancel and refund"
              keepLabel="Keep the order"
              destructive
              loading={cancel.isPending}
              error={cancel.isError ? errorText(cancel.error) : null}
              onConfirm={() => cancel.mutate({ orderNumber: order.order_number })}
              onKeep={() => {
                cancel.reset();
                setCancelling(false);
              }}
            >
              The buyer is refunded {formatNaira(order.total)} in full, you earn nothing from this order, and the items go back
              on sale. This can&apos;t be undone.
            </ConfirmPanel>
          ) : (
            <Button variant="outline" className="justify-self-start" onClick={() => setCancelling(true)}>
              Cancel order
            </Button>
          )}
        </div>
      )}
    </section>
  );
}