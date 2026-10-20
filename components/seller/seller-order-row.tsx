import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatDay } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { shipDeadline } from "@/lib/order-status";
import type { SellerOrder } from "@/lib/types/seller-orders";
import { cn } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

/**
 * One order in a seller's list: who it is for, what, its status in the seller's words, the shipping deadline
 * when there is one, and what the seller earns from it. The whole row opens the order.
 * Meant to sit inside a divided list (see RecentOrders and the orders list).
 */
export function SellerOrderRow({ order }: { order: SellerOrder }) {
  const [first, ...rest] = order.items;
  const deadline = shipDeadline(order);
  const paid = formatDay(order.paid_at);

  return (
    <Link
      href={`/seller/orders/${order.order_number}`}
      className="flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
    >
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{order.ship_to.name}</span>
          <OrderStatusBadge status={order.status} viewer="seller" />
        </div>

        <p className="truncate text-xs text-muted-foreground">
          {first ? `${first.title} × ${first.quantity}` : "Order"}
          {rest.length > 0 && ` and ${rest.length} more`}
          {` · ${order.order_number}`}
          {paid && ` · ${paid}`}
        </p>

        {deadline && (
          <p className={cn("text-xs font-medium", deadline.urgent ? "text-destructive" : "text-warning")}>{deadline.text}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{formatNaira(order.earnings)}</p>
        <p className="text-xs text-muted-foreground">you earn</p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}