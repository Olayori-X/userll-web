import Link from "next/link";
import { Star } from "lucide-react";
import { formatDay } from "@/lib/dates";
import { toQueryString } from "@/lib/query-string";
import type { PublicReview, ReviewPage, StarRating as StarValue } from "@/lib/types/reviews";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/listings/pagination";
import { StarRating } from "@/components/ui/star-rating";

const STARS: StarValue[] = [5, 4, 3, 2, 1];

type ReviewListProps = {
  reviews: ReviewPage;
  /** The shop's slug, for building addresses. */
  slug: string;
  /** The star filter in the address, if any. */
  rating?: StarValue;
};

function reviewsHref(slug: string, rating?: StarValue, page = 1): string {
  return `/sellers/${slug}${toQueryString({ tab: "reviews", rating, page: page > 1 ? page : undefined })}`;
}

function ReviewCard({ review }: { review: PublicReview }) {
  const posted = formatDay(review.created_at);
  const replied = formatDay(review.seller_replied_at);

  return (
    <article className="grid gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarRating rating={review.rating} size="sm" />
        <span className="text-sm font-semibold">{review.reviewer}</span>
        {posted && (
          <time dateTime={review.created_at} className="text-xs text-muted-foreground">
            {posted}
          </time>
        )}
      </div>

      {/* Plain text with line breaks kept. React escapes it, so nothing a buyer typed can run as code. */}
      {review.comment && <p className="text-sm leading-relaxed break-words whitespace-pre-line">{review.comment}</p>}

      {review.seller_reply && (
        <div className="mt-1 grid gap-1 border-l-2 border-primary/40 pl-3">
          <p className="text-xs font-semibold">
            Reply from the seller
            {replied && <span className="font-normal text-muted-foreground"> · {replied}</span>}
          </p>
          <p className="text-sm break-words whitespace-pre-line">{review.seller_reply}</p>
        </div>
      )}
    </article>
  );
}

/**
 * The reviews tab of a shop page: the rating summary and its bars (each bar filters to that many stars),
 * then the reviews with the seller's replies, 20 to a page. No browser code: every filter and page is a link.
 */
export function ReviewList({ reviews, slug, rating }: ReviewListProps) {
  const { summary } = reviews;
  const highest = Math.max(1, ...STARS.map((stars) => summary.distribution[stars] ?? 0));

  return (
    <div className="grid gap-6">
      {summary.reviews_count > 0 && (
        <section aria-label="Rating summary" className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
          <div className="grid justify-items-start gap-1.5 sm:justify-items-center">
            <p className="text-4xl font-extrabold tracking-tight">{summary.rating_average.toFixed(1)}</p>
            <StarRating rating={summary.rating_average} size="lg" />
            <p className="text-xs text-muted-foreground">
              {summary.reviews_count} {summary.reviews_count === 1 ? "review" : "reviews"}
            </p>
          </div>

          <ul className="grid gap-1.5">
            {STARS.map((stars) => {
              const count = summary.distribution[stars] ?? 0;
              const active = rating === stars;

              return (
                <li key={stars}>
                  <Link
                    href={reviewsHref(slug, active ? undefined : stars)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40",
                      active && "bg-accent",
                    )}
                  >
                    <span className="flex w-8 shrink-0 items-center gap-0.5 font-medium">
                      {stars}
                      <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                    </span>

                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="block h-full rounded-full bg-warning" style={{ width: `${(count / highest) * 100}%` }} />
                    </span>

                    <span className="w-8 shrink-0 text-right text-muted-foreground">{count}</span>
                    <span className="sr-only">
                      {stars} {stars === 1 ? "star" : "stars"}: {count} {count === 1 ? "review" : "reviews"}
                      {active ? ", showing only these. Select to show all." : ". Select to show only these."}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {rating && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm">
          <span className="text-muted-foreground">
            Showing {rating}-star reviews ({reviews.meta.total})
          </span>
          <Link href={reviewsHref(slug)} className="font-semibold text-primary hover:underline">
            Show all
          </Link>
        </p>
      )}

      {reviews.data.length === 0 ? (
        <div className="grid justify-items-center gap-1 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-semibold">
            {rating ? `No ${rating}-star reviews` : reviews.meta.current_page > 1 ? "Nothing on this page" : "No reviews yet"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {summary.reviews_count === 0 ? "Reviews appear here after buyers have received their orders." : "Try another rating, or show them all."}
          </p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3">
            {reviews.data.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={reviews.meta.current_page}
            lastPage={reviews.meta.last_page}
            hrefFor={(target) => reviewsHref(slug, rating, target)}
          />
        </>
      )}
    </div>
  );
}