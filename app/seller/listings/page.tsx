import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductsView } from "@/components/seller/products-view";
import { buttonVariants } from "@/components/ui/button";
import type { ListingStatus } from "@/lib/types/catalog";

export const metadata: Metadata = {
  title: "Products",
};

/** The statuses the tabs filter by. Anything else in the address is ignored, so a hand-edited link shows all products. */
const FILTERS: readonly ListingStatus[] = ["active", "draft", "sold_out", "removed"];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type ProductsPageProps = {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
};

export default async function SellerProductsPage({ searchParams }: ProductsPageProps) {
  const raw = await searchParams;

  const status = FILTERS.find((item) => item === first(raw.status));

  const pageNumber = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(pageNumber) && pageNumber > 1 ? Math.min(pageNumber, 500) : 1;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">What you sell. Drafts are only visible to you until you publish them.</p>
        </div>

        <Link href="/seller/listings/new" className={buttonVariants({ size: "sm" })}>
          <Plus aria-hidden />
          Add product
        </Link>
      </div>

      <ProductsView status={status} page={page} />
    </div>
  );
}