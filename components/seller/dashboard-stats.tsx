"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Banknote, Hourglass, Package, Truck, type LucideIcon } from "lucide-react";
import { useSellerListingCount } from "@/hooks/use-seller-listings";
import { useSellerOrders, useWallet } from "@/hooks/use-seller-sales";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";

type StatCardProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** The number. Undefined while it loads. */
  value: ReactNode | undefined;
  hint: string;
  failed: boolean;
  /** Draws attention: there is something to do. */
  urgent?: boolean;
};

function StatCard({ href, label, icon: Icon, value, hint, failed, urgent }: StatCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "grid gap-3 rounded-xl border bg-card p-4 outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40",
        urgent ? "border-warning/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-full", urgent ? "bg-warning-soft text-warning" : "bg-accent text-primary")}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>

      {value !== undefined ? (
        <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      ) : failed ? (
        <p className="text-sm font-medium text-muted-foreground">Couldn&apos;t load</p>
      ) : (
        <div className="h-8 w-28 animate-pulse rounded-md bg-muted" role="status" aria-label={`Loading ${label}`} />
      )}

      <p className="text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}

/**
 * The four numbers at the top of the dashboard, each a link to where you can act on it:
 * what you can withdraw, what is still held, how many orders are waiting to be shipped, how many products are live.
 */
export function DashboardStats() {
  const wallet = useWallet();
  const toShip = useSellerOrders({ status: "paid" });
  const active = useSellerListingCount("active");

  return (
    <section aria-label="Your shop at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        href="/seller/wallet"
        label="Available to withdraw"
        icon={Banknote}
        value={wallet.data ? formatNaira(wallet.data.available_balance) : undefined}
        hint="Paid out from confirmed orders"
        failed={wallet.isError}
      />

      <StatCard
        href="/seller/wallet"
        label="Held until delivery"
        icon={Hourglass}
        value={wallet.data ? formatNaira(wallet.data.pending_balance) : undefined}
        hint="Released when buyers confirm"
        failed={wallet.isError}
      />

      <StatCard
        href="/seller/orders?status=paid"
        label="Orders to ship"
        icon={Truck}
        value={toShip.data?.meta.total}
        hint={toShip.data && toShip.data.meta.total > 0 ? "Ship before the deadline" : "Nothing waiting"}
        failed={toShip.isError}
        urgent={(toShip.data?.meta.total ?? 0) > 0}
      />

      <StatCard
        href="/seller/listings?status=active"
        label="Active products"
        icon={Package}
        value={active.count}
        hint="Live for buyers to see"
        failed={active.count === undefined && !active.isPending}
      />
    </section>
  );
}