"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useSellerOrders } from "@/hooks/use-seller-sales";
import { SellerOrderRow } from "@/components/seller/seller-order-row";
import { Button } from "@/components/ui/button";

const HOW_MANY = 5;

/** The newest few orders on the dashboard, each opening its own page. The list refreshes itself every minute. */
export function RecentOrders() {
  const orders = useSellerOrders({});

  return (
    <section aria-labelledby="recent-heading" className="grid gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-heading" className="text-lg font-bold">
          Recent orders
        </h2>
        <Link href="/seller/orders" className="text-sm font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>

      {orders.isPending && (
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border" role="status">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[72px] animate-pulse bg-card" />
          ))}
          <span className="sr-only">Loading your orders</span>
        </div>
      )}

      {orders.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="text-muted-foreground">We couldn&apos;t load your orders.</p>
          <Button variant="link" onClick={() => void orders.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {orders.data && orders.data.data.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <ShoppingBag className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">No orders yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            When someone buys something from your shop, it shows up here, and you&apos;ll get a message.
          </p>
        </div>
      )}

      {orders.data && orders.data.data.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {orders.data.data.slice(0, HOW_MANY).map((order) => (
            <li key={order.order_number}>
              <SellerOrderRow order={order} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}