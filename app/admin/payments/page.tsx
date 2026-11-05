import type { Metadata } from "next";
import { PaymentQueue } from "@/components/admin/payment-queue";

export const metadata: Metadata = {
  title: "Payments",
};

const STATUSES = ["needs_refund", "refunded", "paid", "pending", "failed"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type AdminPaymentsPageProps = {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
};

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const raw = await searchParams;

  // "To refund" when the address names nothing, or names something that is not a real tab.
  const status = STATUSES.find((item) => item === first(raw.status)) ?? "needs_refund";

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Buyers who paid but couldn&apos;t get an order are waiting here for their money back.
        </p>
      </div>

      <PaymentQueue status={status} page={page} />
    </div>
  );
}