import Link from "next/link";
import { MapPin, ShieldCheck, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import type { SellerSummary } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";

/** "2026-03-14" -> "March 2026". Read as UTC, so the month never slips a day either way. */
function memberSince(date: string): string | null {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }).format(parsed);
}

type SellerCardProps = {
  seller: SellerSummary;
  className?: string;
};

/** Who is selling: shop name, verified badge, rating, where they are and since when, with a link to their shop. */
export function SellerCard({ seller, className }: SellerCardProps) {
  const place = [seller.city, seller.state].filter(Boolean).join(", ");
  const since = memberSince(seller.member_since);
  const hasReviews = seller.reviews_count > 0;
  const reviewWord = seller.reviews_count === 1 ? "review" : "reviews";

  return (
    <section aria-label="Seller" className={cn("grid gap-3 rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-3">
        <Avatar name={seller.store_name} size="md" />

        <div className="grid min-w-0 gap-0.5">
          <p className="truncate font-semibold">{seller.store_name}</p>

          {seller.is_verified && (
            <p className="flex items-center gap-1 text-xs font-semibold text-success">
              <ShieldCheck className="size-3.5" aria-hidden />
              Verified seller
            </p>
          )}
        </div>
      </div>

      {/* A star next to "0.0" would look like a bad rating, so an unreviewed shop says so in words. */}
      <p className="flex items-center gap-1.5 text-sm">
        {hasReviews ? (
          <>
            <Star className="size-4 fill-warning text-warning" aria-hidden />
            <span className="font-semibold">{seller.rating_average.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({seller.reviews_count} {reviewWord})
            </span>
            <span className="sr-only">
              Rated {seller.rating_average.toFixed(1)} out of 5 from {seller.reviews_count} {reviewWord}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">No reviews yet</span>
        )}
      </p>

      {(place || since) && (
        <ul className="grid gap-1 text-xs text-muted-foreground">
          {place && (
            <li className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {place}
            </li>
          )}
          {since && <li>Selling on Userll since {since}</li>}
        </ul>
      )}

      {seller.bio && <p className="line-clamp-3 text-sm text-muted-foreground">{seller.bio}</p>}

      <Link href={`/sellers/${seller.slug}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
        Visit shop
      </Link>
    </section>
  );
}