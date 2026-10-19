import { statusInfo, type OrderViewer, type StatusTone } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types/checkout";
import { cn } from "@/lib/utils";

/** The strong colour is for the text, and the soft one is the pill behind it: the same status colours as the alerts. */
const TONES: Record<StatusTone, string> = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

type OrderStatusBadgeProps = {
  status: OrderStatus;
  /** Whose words to use. A "paid" order is "Paid" to a buyer and "To ship" to the seller. */
  viewer?: OrderViewer;
  className?: string;
};

/** The small coloured pill with an order's status. */
export function OrderStatusBadge({ status, viewer = "buyer", className }: OrderStatusBadgeProps) {
  // A status the API adds one day, which this screen has not heard of, still shows as plain words.
  const info = statusInfo(status, viewer) ?? { label: String(status).replace(/_/g, " "), tone: "neutral" as const };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONES[info.tone],
        className,
      )}
    >
      {info.label}
    </span>
  );
}