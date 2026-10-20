"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useSellerOrder } from "@/hooks/use-seller-sales";
import { formatDateTime, formatDay } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { statusInfo } from "@/lib/order-status";
import type { SellerOrder } from "@/lib/types/seller-orders";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { MessageButton } from "@/components/messages/message-button";
import { OrderProgress } from "@/components/orders/order-progress";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { SellerOrderActions } from "@/components/seller/seller-order-actions";
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
function StatusNotice({ order }: { order: SellerOrder }) {
  switch (order.status) {
    case "shipped":
      return (
        <Alert variant="info">
          Waiting for the buyer to confirm they received it. You&apos;re paid when they do, or automatically if they
          don&apos;t.
        </Alert>
      );

    case "disputed":
      return (
        <Alert variant="warning" title="The buyer reported a problem">
          {"We're looking into it, and we'll tell you the outcome here. Your payment for this order is on hold until it's decided."}
        </Alert>
      );

    case "completed":
      return (
        <Alert variant="success">
          {`Done. ${formatNaira(order.earnings)} is in your wallet.`}{" "}
          <Link href="/seller/wallet" className="font-semibold underline">
            Open wallet
          </Link>
        </Alert>
      );

    case "refunded":
      return <Alert variant="info">The buyer was refunded in full. Nothing is owed to you for this order.</Alert>;

    case "cancelled":
      return <Alert variant="info">This order was cancelled. Nothing is owed to you for this order.</Alert>;

    default:
      return null;
  }
}

function ItemsCard({ order }: { order: SellerOrder }) {
  // 500 basis points is 5 percent, 250 is 2.5 percent.
  const rate = order.commission_rate_bps / 100;

  return (
    <Card title="Items and earnings">
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
        <dt className="text-muted-foreground">Items</dt>
        <dd className="text-right font-medium">{formatNaira(order.subtotal)}</dd>

        <dt className="text-muted-foreground">Delivery fee</dt>
        <dd className="text-right font-medium">{order.delivery_fee === 0 ? "Free" : formatNaira(order.delivery_fee)}</dd>

        <dt className="border-t border-border pt-2 font-medium">Buyer paid</dt>
        <dd className="border-t border-border pt-2 text-right font-semibold">{formatNaira(order.total)}</dd>

        <dt className="text-muted-foreground">Userll commission ({rate}%)</dt>
        <dd className="text-right font-medium text-muted-foreground">− {formatNaira(order.commission)}</dd>

        <dt className="border-t border-border pt-3 font-bold">You earn</dt>
        <dd className="border-t border-border pt-3 text-right text-lg font-extrabold">{formatNaira(order.earnings)}</dd>
      </dl>
    </Card>
  );
}

function ShipToCard({ order }: { order: SellerOrder }) {
  const { ship_to: to } = order;

  return (
    <Card title="Ship to">
      <address className="grid gap-0.5 text-sm not-italic">
        <span className="font-semibold">{to.name}</span>
        <span className="text-muted-foreground">{to.phone}</span>
        <span className="break-words">{to.street}</span>
        <span className="text-muted-foreground">
          {to.city}, {to.state}
        </span>
      </address>

      {order.tracking_info && (
        <div className="grid gap-1 border-t border-border pt-3">
          <p className="text-sm font-semibold">Tracking details you sent</p>
          <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{order.tracking_info}</p>
        </div>
      )}
    </Card>
  );
}

function DatesCard({ order }: { order: SellerOrder }) {
  const waiting = order.status === "paid";

  const rows: [string, string | null][] = [
    ["Paid", formatDateTime(order.paid_at)],
    [waiting ? "Ship by" : "", waiting ? formatDay(order.ship_by_at) : null],
    ["Shipped", formatDateTime(order.shipped_at)],
    ["Delivered", formatDateTime(order.delivered_at)],
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

export function SellerOrderDetail({ orderNumber }: { orderNumber: string }) {
  const query = useSellerOrder(orderNumber);

  if (query.isPending) return <PageSkeleton label="Loading the order" />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <PageNotice icon={<PackageX className="size-7" aria-hidden />} title="We couldn't find that order">
          <p className="text-sm text-muted-foreground">It may belong to a different shop, or the link is wrong.</p>
          <Link href="/seller/orders" className={buttonVariants({ size: "lg" })}>
            All orders
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
  const info = statusInfo(order.status, "seller");
  const placed = formatDay(order.paid_at ?? order.created_at);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link href="/seller/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          Orders
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-bold tracking-tight break-all">Order {order.order_number}</h1>
            {placed && <p className="text-sm text-muted-foreground">Placed {placed}</p>}
          </div>

          <OrderStatusBadge status={order.status} viewer="seller" className="px-3 py-1 text-sm" />
        </div>

        {info && <p className="text-sm text-muted-foreground">{info.hint}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="grid gap-6">
          <OrderProgress status={order.status} className="rounded-xl border border-border bg-card px-4 py-5" />

          <StatusNotice order={order} />

          <SellerOrderActions order={order} />

          <ItemsCard order={order} />
        </div>

        <div className="grid gap-6">
          <ShipToCard order={order} />
          <DatesCard order={order} />
          <MessageButton about={{ order: order.order_number }}>Message the buyer</MessageButton>
        </div>
      </div>
    </div>
  );
}