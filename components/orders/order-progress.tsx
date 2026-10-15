import { Check } from "lucide-react";
import { orderSteps } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types/checkout";
import { cn } from "@/lib/utils";

type OrderProgressProps = {
  status: OrderStatus;
  className?: string;
};

/**
 * Paid, Shipped, Completed, as in the order-tracking mockup: a tick for what is done, a red ring for what
 * the order is waiting for now. Orders that were cancelled or refunded never finished, so they show nothing.
 */
export function OrderProgress({ status, className }: OrderProgressProps) {
  const steps = orderSteps(status);

  if (!steps) return null;

  return (
    <ol aria-label="Order progress" className={cn("flex items-start", className)}>
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex flex-1 flex-col items-center gap-2 text-center"
        >
          {/* The line to the previous step. It is solid red once that step is done. */}
          {index > 0 && (
            <span
              aria-hidden
              className={cn(
                "absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2",
                steps[index - 1].state === "done" ? "bg-primary" : "bg-border",
              )}
            />
          )}

          <span
            aria-hidden
            className={cn(
              "relative flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold",
              step.state === "done" && "border-primary bg-primary text-primary-foreground",
              step.state === "current" && "border-primary bg-card text-primary ring-4 ring-primary/15",
              step.state === "upcoming" && "border-border bg-card text-muted-foreground",
            )}
          >
            {step.state === "done" ? <Check className="size-4" /> : index + 1}
          </span>

          <span className={cn("text-xs font-medium", step.state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
            {step.label}
            <span className="sr-only">
              {step.state === "done" ? ", done" : step.state === "current" ? ", in progress" : ", not reached yet"}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}