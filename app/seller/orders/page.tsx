import type { Metadata } from "next";
import { SellerOrdersView } from "@/components/seller/seller-orders-view";
import type { OrderStatus } from "@/lib/types/checkout";

export const metadata: Metadata = {
  title: "Orders",
};

/** The statuses the tabs filter by. Anything else in the address is ignored, so a hand-edited link shows all orders. */
const FILTERS: readonly OrderStatus[] = ["paid", "shipped", "completed", "disputed", "cancelled", "refunded"];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type SellerOrdersPageProps = {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
};

export default async function SellerOrdersPage({ searchParams }: SellerOrdersPageProps) {
  const raw = await searchParams;

  const status = FILTERS.find((item) => item === first(raw.status));

  const pageNumber = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(pageNumber) && pageNumber > 1 ? Math.min(pageNumber, 500) : 1;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Ship paid orders before their deadline to get paid.</p>
      </div>

      <SellerOrdersView status={status} page={page} />
    </div>
  );
}