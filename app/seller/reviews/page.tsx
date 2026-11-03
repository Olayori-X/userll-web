import type { Metadata } from "next";
import { SellerReviewsView } from "@/components/seller/seller-reviews-view";

export const metadata: Metadata = {
  title: "Reviews",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type SellerReviewsPageProps = {
  searchParams: Promise<{ needs_reply?: string | string[]; page?: string | string[] }>;
};

export default async function SellerReviewsPage({ searchParams }: SellerReviewsPageProps) {
  const raw = await searchParams;

  const needsReply = first(raw.needs_reply) === "1";

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">What buyers say about your shop. A thoughtful reply shows other buyers you care.</p>
      </div>

      <SellerReviewsView needsReply={needsReply} page={page} />
    </div>
  );
}