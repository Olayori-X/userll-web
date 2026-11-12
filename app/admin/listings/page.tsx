import type { Metadata } from "next";
import { AdminListingList } from "@/components/admin/admin-listing-list";

export const metadata: Metadata = {
  title: "Listings",
};

const STATUSES = ["active", "draft", "sold_out", "removed"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type AdminListingsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    search?: string | string[];
    seller?: string | string[];
    page?: string | string[];
  }>;
};

export default async function AdminListingsPage({ searchParams }: AdminListingsPageProps) {
  const raw = await searchParams;

  // "All" when the address names nothing, or names something that is not a real tab.
  const status = STATUSES.find((item) => item === first(raw.status)) ?? "all";

  const search = first(raw.search)?.trim().slice(0, 100) || undefined; // the API's limit

  // A seller is addressed by their user number.
  const sellerText = first(raw.seller);
  const sellerId = sellerText && /^[1-9][0-9]{0,9}$/.test(sellerText) ? Number(sellerText) : undefined;

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Listings</h1>
        <p className="text-sm text-muted-foreground">Everything for sale, newest first. Open one to look it over, and take it down if it breaks the rules.</p>
      </div>

      <AdminListingList status={status} search={search} sellerId={sellerId} page={page} />
    </div>
  );
}