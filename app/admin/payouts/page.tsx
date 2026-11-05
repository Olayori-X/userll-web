import type { Metadata } from "next";
import { PayoutList } from "@/components/admin/payout-list";

export const metadata: Metadata = {
  title: "Payouts",
};

const STATUSES = ["pending", "processing", "paid", "failed", "reversed"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type AdminPayoutsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    reference?: string | string[];
    seller?: string | string[];
    page?: string | string[];
  }>;
};

export default async function AdminPayoutsPage({ searchParams }: AdminPayoutsPageProps) {
  const raw = await searchParams;

  // "All" when the address names nothing, or names something that is not a real tab.
  const status = STATUSES.find((item) => item === first(raw.status)) ?? "all";

  // A Paystack reference or transfer code: letters, digits and a few separators. Anything else is ignored, not sent to the API.
  const referenceText = first(raw.reference)?.trim().slice(0, 100);
  const reference = referenceText && /^[A-Za-z0-9_.:-]+$/.test(referenceText) ? referenceText : undefined;

  // A seller is addressed by their user number.
  const sellerText = first(raw.seller);
  const sellerId = sellerText && /^[1-9][0-9]{0,9}$/.test(sellerText) ? Number(sellerText) : undefined;

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Sellers&apos; withdrawals. A failed one is returned to the seller&apos;s balance by itself. Look for ones that haven&apos;t moved.
        </p>
      </div>

      <PayoutList status={status} reference={reference} sellerId={sellerId} page={page} />
    </div>
  );
}