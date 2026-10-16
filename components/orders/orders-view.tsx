"use client";

import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { useOrders } from "@/hooks/use-orders";
import { formatDay } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { ORDER_STATUS } from "@/lib/order-status";
import { toQueryString } from "@/lib/query-string";
import type { Order, OrderStatus } from "@/lib/types/checkout";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/listings/pagination";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

/** The filter tabs. "delivered" is left out: it is a brief step on the way to "completed". */
const TABS: { status: OrderStatus | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "paid", label: "Paid" },
  { status: "shipped", label: "Shipped" },
  { status: "completed", label: "Completed" },
  { status: "disputed", label: "Problems" },
  { status: "cancelled", label: "Cancelled" },
  { status: "refunded", label: "Refunded" },
];

function ordersHref(status: OrderStatus | undefined, page = 1): string {
  return `/orders${toQueryString({ status, page: page > 1 ? page : undefined })}`;
}

function OrderCard({ order }: { order: Order }) {
  const hint = ORDER_STATUS[order.status]?.hint;
  const paid = formatDay(order.paid_at);
  const [first, ...rest] = order.items;

  return (
    <Link
      href={`/orders/${order.order_number}`}
      className="grid gap-3 rounded-xl border border-border bg-card p-4 outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-0.5">
          <p className="truncate font-semibold">{order.seller?.store_name ?? "Seller"}</p>
          <p className="text-xs text-muted-foreground">
            Order {order.order_number}
            {paid && ` · ${paid}`}
          </p>
        </div>

        <OrderStatusBadge status={order.status} />
      </div>

      {first && (
        <p className="text-sm">
          <span className="line-clamp-1">
            {first.title} <span className="text-muted-foreground">× {first.quantity}</span>
          </span>
          {rest.length > 0 && (
            <span className="text-xs text-muted-foreground">
              and {rest.length} more {rest.length === 1 ? "item" : "items"}
            </span>
          )}
        </p>
      )}

      <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">{hint}</p>
        <p className="shrink-0 font-bold">{formatNaira(order.total)}</p>
      </div>
    </Link>
  );
}

type OrdersViewProps = {
  /** From the address, already checked against the real statuses. */
  status?: OrderStatus;
  page: number;
};

export function OrdersView({ status, page }: OrdersViewProps) {
  const orders = useOrders({ status, page: page > 1 ? page : undefined });

  return (
    <div className="grid gap-5">
      <nav aria-label="Filter orders">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const active = tab.status === status;

            return (
              <li key={tab.label} className="shrink-0">
                <Link
                  href={ordersHref(tab.status)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.isPending && <PageSkeleton label="Loading your orders" />}

      {orders.isError && (
        <Alert variant="error" title="We couldn't load your orders">
          <Button variant="link" onClick={() => void orders.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {orders.data && orders.data.data.length === 0 && (
        <PageNotice
          icon={<PackageSearch className="size-7" aria-hidden />}
          title={status ? "Nothing here" : "No orders yet"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {status
              ? "You have no orders with this status."
              : page > 1
                ? "There are no orders on this page."
                : "When you buy something, it will show up here."}
          </p>
          {status || page > 1 ? (
            <Link href="/orders" className={buttonVariants({ size: "lg" })}>
              Show all orders
            </Link>
          ) : (
            <Link href="/listings" className={buttonVariants({ size: "lg" })}>
              Browse products
            </Link>
          )}
        </PageNotice>
      )}

      {orders.data && orders.data.data.length > 0 && (
        <>
          {/* While the next page loads, the old one stays visible but dimmed, so the screen does not jump. */}
          <ul className={cn("grid gap-3 transition-opacity", orders.isPlaceholderData && "opacity-60")}>
            {orders.data.data.map((order) => (
              <li key={order.order_number}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={orders.data.meta.current_page}
            lastPage={orders.data.meta.last_page}
            hrefFor={(target) => ordersHref(status, target)}
          />
        </>
      )}
    </div>
  );
}