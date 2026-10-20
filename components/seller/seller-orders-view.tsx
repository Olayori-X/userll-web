"use client";

import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { useSellerOrders } from "@/hooks/use-seller-sales";
import { toQueryString } from "@/lib/query-string";
import type { OrderStatus } from "@/lib/types/checkout";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { SellerOrderRow } from "@/components/seller/seller-order-row";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

/** The filter tabs, in the seller's own words. "delivered" is left out: it is a brief step on the way to "completed". */
const TABS: { status: OrderStatus | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "paid", label: "To ship" },
  { status: "shipped", label: "On its way" },
  { status: "completed", label: "Completed" },
  { status: "disputed", label: "Problems" },
  { status: "cancelled", label: "Cancelled" },
  { status: "refunded", label: "Refunded" },
];

function ordersHref(status: OrderStatus | undefined, page = 1): string {
  return `/seller/orders${toQueryString({ status, page: page > 1 ? page : undefined })}`;
}

type SellerOrdersViewProps = {
  /** From the address, already checked against the real statuses. */
  status?: OrderStatus;
  page: number;
};

export function SellerOrdersView({ status, page }: SellerOrdersViewProps) {
  const orders = useSellerOrders({ status, page: page > 1 ? page : undefined });

  // The same question the dashboard asks, so it is one shared answer: how many are waiting to be shipped.
  const toShip = useSellerOrders({ status: "paid" });
  const waiting = toShip.data?.meta.total ?? 0;

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
                    active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                  {tab.status === "paid" && waiting > 0 && ` (${waiting})`}
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
          title={status === "paid" ? "Nothing to ship" : status ? "Nothing here" : "No orders yet"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {status === "paid"
              ? "You're all caught up. New orders will show up here, and you'll get a message."
              : status
                ? "You have no orders with this status."
                : page > 1
                  ? "There are no orders on this page."
                  : "When someone buys something from your shop, it shows up here."}
          </p>
          {(status || page > 1) && (
            <Link href="/seller/orders" className={buttonVariants({ size: "lg" })}>
              Show all orders
            </Link>
          )}
        </PageNotice>
      )}

      {orders.data && orders.data.data.length > 0 && (
        <>
          {/* While the next page loads, the old one stays visible but dimmed, so the screen does not jump. */}
          <ul
            className={cn(
              "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card transition-opacity",
              orders.isPlaceholderData && "opacity-60",
            )}
          >
            {orders.data.data.map((order) => (
              <li key={order.order_number}>
                <SellerOrderRow order={order} />
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