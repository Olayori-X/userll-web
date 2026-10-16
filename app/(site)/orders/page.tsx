import type { Metadata } from "next";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";
import { OrdersView } from "@/components/orders/orders-view";
import { toQueryString } from "@/lib/query-string";
import type { OrderStatus } from "@/lib/types/checkout";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false }, // a private page, nothing for search engines
};

/** The statuses the tabs filter by. Anything else in the address is ignored, so a hand-edited link shows all orders. */
const FILTERS: readonly OrderStatus[] = ["paid", "shipped", "completed", "disputed", "cancelled", "refunded"];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type OrdersPageProps = {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const raw = await searchParams;

  const status = FILTERS.find((item) => item === first(raw.status));

  const pageNumber = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(pageNumber) && pageNumber > 1 ? Math.min(pageNumber, 500) : 1;

  // If their login ran out, the login page brings them back to this same list, filter and page included.
  const here = `/orders${toQueryString({ status, page: page > 1 ? page : undefined })}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">My orders</h1>

      <RequireVerifiedUser
        next={here}
        loginTitle="Log in to see your orders"
        loginText="Your orders are saved to your account."
        verifyText="Confirm your email address to see your orders."
      >
        <OrdersView status={status} page={page} />
      </RequireVerifiedUser>
    </div>
  );
}