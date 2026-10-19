import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StarRating } from "@/components/ui/star-rating";
import type { SellerSummary } from "@/lib/types/catalog";

/** "2026-03-14" -> "March 2026". Read as UTC, so the month never slips a day either way. */
function memberSince(date: string): string | null {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }).format(parsed);
}

/** The top of a shop page: who the seller is, how well reviewed, where they are, and since when. */
export function SellerHeader({ seller }: { seller: SellerSummary }) {
  const place = [seller.city, seller.state].filter(Boolean).join(", ");
  const since = memberSince(seller.member_since);
  const hasReviews = seller.reviews_count > 0;
  const reviewWord = seller.reviews_count === 1 ? "review" : "reviews";

  return (
    <header className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:flex sm:items-start sm:gap-5 sm:p-6">
      <Avatar name={seller.store_name} size="lg" className="size-16 text-xl sm:size-20 sm:text-2xl" />

      <div className="grid min-w-0 flex-1 gap-3">
        <div className="grid gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight break-words">{seller.store_name}</h1>

          {seller.is_verified && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <ShieldCheck className="size-4" aria-hidden />
              Verified seller
            </p>
          )}
        </div>

        {/* A star beside "0.0" would look like a bad rating, so a shop with no reviews says so in words. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {hasReviews ? (
            <>
              <StarRating rating={seller.rating_average} />
              <span className="font-semibold">{seller.rating_average.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({seller.reviews_count} {reviewWord})
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">No reviews yet</span>
          )}
        </p>

        {(place || since) && (
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {place && (
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {place}
              </li>
            )}
            {since && (
              <li className="flex items-center gap-1.5">
                <CalendarDays className="size-4 shrink-0" aria-hidden />
                Selling on Userll since {since}
              </li>
            )}
          </ul>
        )}

        {/* Plain text with the seller's own line breaks kept. React escapes it, so nothing in it can run as code. */}
        {seller.bio && <p className="max-w-2xl text-sm leading-relaxed break-words whitespace-pre-line">{seller.bio}</p>}
      </div>
    </header>
  );
}
