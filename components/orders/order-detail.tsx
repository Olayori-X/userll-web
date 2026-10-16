"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useOrder } from "@/hooks/use-orders";
import { daysUntil, formatDateTime, formatDay } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { ORDER_STATUS, orderActions } from "@/lib/order-status";
import type { Order } from "@/lib/types/checkout";
import { SellerCard } from "@/components/listings/seller-card";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { OrderActions } from "@/components/orders/order-actions";
import { OrderProgress } from "@/components/orders/order-progress";
import { OrderReview } from "@/components/orders/order-review";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** One plain sentence about where the order stands, for the situations that need explaining. */
function StatusNotice({ order }: { order: Order }) {
  switch (order.status) {
    case "paid": {
      const shipBy = formatDay(order.ship_by_at);
      const days = daysUntil(order.ship_by_at);

      if (days !== null && days <= 0) {
        return (
          <Alert variant="warning">
            {"The seller's shipping deadline has passed. If it still isn't shipped, your order will be cancelled and you'll be refunded automatically."}
          </Alert>
        );
      }

      return (
        <Alert variant="info">
          {shipBy
            ? `The seller has until ${shipBy} to ship it. If they don't, your order is cancelled and you're refunded automatically.`
            : "The seller is getting your order ready to ship."}
        </Alert>
      );
    }

    case "disputed":
      return (
        <Alert variant="warning" title="Problem reported">
          {"We're looking into it. The seller isn't paid until it's decided, and we'll tell you the outcome here."}
        </Alert>
      );

    case "refunded":
      return (
        <Alert variant="info">
          {`You were refunded ${formatNaira(order.total)} in full. A refund can take a few days to show in your account.`}
        </Alert>
      );

    case "cancelled":
      return <Alert variant="info">This order was cancelled.</Alert>;

    case "completed":
      return <Alert variant="success">This order is complete, and the seller has been paid.</Alert>;

    default:
      return null;
  }
}

function ItemsCard({ order }: { order: Order }) {
  return (
    <Card title="Items">
      <ul className="divide-y divide-border">
        {order.items.map((item, index) => (
          <li key={index} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="grid min-w-0 gap-0.5">
              <p className="text-sm font-medium break-words">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × {formatNaira(item.unit_price)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold">{formatNaira(item.line_total)}</p>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right font-medium">{formatNaira(order.subtotal)}</dd>

        <dt className="text-muted-foreground">Delivery</dt>
        <dd className="text-right font-medium">{order.delivery_fee === 0 ? "Free" : formatNaira(order.delivery_fee)}</dd>

        <dt className="border-t border-border pt-3 font-bold">Total paid</dt>
        <dd className="border-t border-border pt-3 text-right text-lg font-extrabold">{formatNaira(order.total)}</dd>
      </dl>
    </Card>
  );
}

function DeliveryCard({ order }: { order: Order }) {
  const { shipping } = order;

  return (
    <Card title="Delivery">
      <address className="grid gap-0.5 text-sm not-italic">
        <span className="font-semibold">{shipping.name}</span>
        <span className="text-muted-foreground">{shipping.phone}</span>
        <span className="break-words">{shipping.street}</span>
        <span className="text-muted-foreground">
          {shipping.city}, {shipping.state}
        </span>
      </address>

      {order.tracking_info && (
        <div className="grid gap-1 border-t border-border pt-3">
          <p className="text-sm font-semibold">Tracking from the seller</p>
          <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{order.tracking_info}</p>
        </div>
      )}
    </Card>
  );
}

function DatesCard({ order }: { order: Order }) {
  const open = order.status === "paid";
  const rows: [string, string | null][] = [
    ["Paid", formatDateTime(order.paid_at)],
    [open ? "Seller ships by" : "", open ? formatDay(order.ship_by_at) : null],
    ["Shipped", formatDateTime(order.shipped_at)],
    ["Delivered", formatDateTime(order.delivered_at)],
    [order.status === "shipped" ? "Paid out automatically on" : "", order.status === "shipped" ? formatDay(order.auto_release_at) : null],
  ];

  const shown = rows.filter((row): row is [string, string] => row[1] !== null);

  if (shown.length === 0) return null;

  return (
    <Card title="Dates">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {shown.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function OrderDetail({ orderNumber }: { orderNumber: string }) {
  const query = useOrder(orderNumber);

  if (query.isPending) return <PageSkeleton label="Loading your order" />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <PageNotice icon={<PackageX className="size-7" aria-hidden />} title="We couldn't find that order">
          <p className="text-sm text-muted-foreground">It may belong to a different account, or the link is wrong.</p>
          <Link href="/orders" className={buttonVariants({ size: "lg" })}>
            My orders
          </Link>
        </PageNotice>
      );
    }

    return (
      <Alert variant="error" title="We couldn't load this order">
        <Button variant="link" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const order = query.data;
  const info = ORDER_STATUS[order.status];
  const placed = formatDay(order.paid_at ?? order.created_at);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          My orders
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-bold tracking-tight break-all">Order {order.order_number}</h1>
            {placed && <p className="text-sm text-muted-foreground">Placed {placed}</p>}
          </div>

          <OrderStatusBadge status={order.status} className="px-3 py-1 text-sm" />
        </div>

        {info && <p className="text-sm text-muted-foreground">{info.hint}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="grid gap-6">
          <OrderProgress status={order.status} className="rounded-xl border border-border bg-card px-4 py-5" />

          <StatusNotice order={order} />

          <OrderActions order={order} />

          {orderActions(order).canReview && (
            <section aria-label="Review" className="rounded-xl border border-border bg-card p-5">
              <OrderReview orderNumber={order.order_number} storeName={order.seller?.store_name} />
            </section>
          )}

          <ItemsCard order={order} />
        </div>

        <div className="grid gap-6">
          {order.seller && <SellerCard seller={order.seller} />}
          <DeliveryCard order={order} />
          <DatesCard order={order} />
        </div>
      </div>
    </div>
  );
}