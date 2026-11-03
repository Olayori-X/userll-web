"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquareText } from "lucide-react";
import { z } from "zod";
import { useReplyToReview, useSellerReviews } from "@/hooks/use-seller-reviews";
import { formatDay } from "@/lib/dates";
import { applyApiErrors } from "@/lib/form-errors";
import { toQueryString } from "@/lib/query-string";
import type { OwnReview } from "@/lib/types/orders";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";

const REPLY_MAX = 500; // the API's limit

const replySchema = z.object({
  reply: z.string().trim().min(2, "Write at least 2 characters.").max(REPLY_MAX, `Please keep it under ${REPLY_MAX} characters.`),
});

type ReplyValues = z.infer<typeof replySchema>;

const reviewsHref = (needsReply: boolean, page = 1) =>
  `/seller/reviews${toQueryString({ needs_reply: needsReply || undefined, page: page > 1 ? page : undefined })}`;

/** The reply box. A reply is public and cannot be edited, so it says so before anything is posted. */
function ReplyBox({ review }: { review: OwnReview }) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const reply = useReplyToReview();

  const form = useForm<ReplyValues>({ resolver: zodResolver(replySchema), defaultValues: { reply: "" } });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form;

  const length = watch("reply")?.length ?? 0;

  const submit = handleSubmit((values) => {
    setFormError(null);

    reply.mutate(
      { reviewId: review.id, reply: values.reply },
      // A problem about the review itself ("already replied to", "hidden") is not about the text, so it shows above the box.
      { onError: (error) => setFormError(applyApiErrors(error, setError, ["reply"])) },
    );
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setOpen(true)}>
        Reply
      </Button>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border border-border bg-muted/50 p-3">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Your reply"
        error={errors.reply?.message}
        hint="Everyone can see your reply, and you can't edit or delete it afterwards. Be polite and read it over first."
      >
        {(control) => (
          <>
            <Textarea rows={3} maxLength={REPLY_MAX} placeholder="Thank them, or answer what they raised." {...register("reply")} {...control} />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {length} / {REPLY_MAX}
            </p>
          </>
        )}
      </FormField>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={reply.isPending}>
          Post reply
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={reply.isPending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ReviewCard({ review }: { review: OwnReview }) {
  const posted = formatDay(review.created_at);
  const replied = formatDay(review.seller_replied_at);

  return (
    <article className={cn("grid gap-3 rounded-xl border bg-card p-4", review.is_hidden ? "border-destructive/30" : "border-border")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarRating rating={review.rating} size="sm" />
        <span className="text-sm font-semibold">{review.reviewer}</span>
        {posted && (
          <time dateTime={review.created_at} className="text-xs text-muted-foreground">
            {posted}
          </time>
        )}
        {review.order_number && (
          <Link href={`/seller/orders/${review.order_number}`} className="text-xs text-muted-foreground hover:text-primary hover:underline">
            Order {review.order_number}
          </Link>
        )}
      </div>

      {/* Plain text with line breaks kept. React escapes it, so nothing a buyer typed can run as code. */}
      {review.comment ? (
        <p className="text-sm leading-relaxed break-words whitespace-pre-line">{review.comment}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No comment, just the rating.</p>
      )}

      {review.is_hidden && (
        <Alert variant="warning" title="Hidden from the public">
          {review.hidden_reason ?? "An admin hid this review."} Buyers can&apos;t see it, and you can&apos;t reply to it.
        </Alert>
      )}

      {review.seller_reply ? (
        <div className="grid gap-1 border-l-2 border-primary/40 pl-3">
          <p className="text-xs font-semibold">
            Your reply{replied && <span className="font-normal text-muted-foreground"> · {replied}</span>}
          </p>
          <p className="text-sm break-words whitespace-pre-line">{review.seller_reply}</p>
        </div>
      ) : (
        review.can_reply && <ReplyBox review={review} />
      )}
    </article>
  );
}

type SellerReviewsViewProps = {
  needsReply: boolean;
  page: number;
};

export function SellerReviewsView({ needsReply, page }: SellerReviewsViewProps) {
  const reviews = useSellerReviews({ needsReply, page });

  // How many are waiting, for the tab. When the "Needs reply" tab is open, this is the very same request.
  const waiting = useSellerReviews({ needsReply: true });
  const waitingCount = waiting.data?.meta.total ?? 0;

  const summary = reviews.data?.summary;

  return (
    <div className="grid gap-5">
      {summary && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {summary.reviews_count > 0 ? (
            <>
              <StarRating rating={summary.rating_average} />
              <span className="font-semibold">{summary.rating_average.toFixed(1)}</span>
              <span className="text-muted-foreground">
                from {summary.reviews_count} {summary.reviews_count === 1 ? "review" : "reviews"}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">No reviews yet</span>
          )}
        </p>
      )}

      <nav aria-label="Filter reviews">
        <ul className="flex gap-2">
          {[
            { label: "All", only: false },
            { label: waitingCount > 0 ? `Needs reply (${waitingCount})` : "Needs reply", only: true },
          ].map((tab) => (
            <li key={tab.label}>
              <Link
                href={reviewsHref(tab.only)}
                aria-current={tab.only === needsReply ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  tab.only === needsReply ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                )}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {reviews.isPending && <PageSkeleton label="Loading your reviews" />}

      {reviews.isError && (
        <Alert variant="error" title="We couldn't load your reviews">
          <Button variant="link" onClick={() => void reviews.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {reviews.data && reviews.data.data.length === 0 && (
        <PageNotice
          icon={<MessageSquareText className="size-7" aria-hidden />}
          title={needsReply ? "You're all caught up" : page > 1 ? "Nothing on this page" : "No reviews yet"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {needsReply
              ? "Every review has a reply."
              : page > 1
                ? "There are no reviews on this page."
                : "Buyers can review an order once it's completed. Their reviews will show up here."}
          </p>
          {(needsReply || page > 1) && (
            <Link href="/seller/reviews" className={buttonVariants({ size: "lg" })}>
              Show all reviews
            </Link>
          )}
        </PageNotice>
      )}

      {reviews.data && reviews.data.data.length > 0 && (
        <>
          <ul className={cn("grid gap-3 transition-opacity", reviews.isPlaceholderData && "opacity-60")}>
            {reviews.data.data.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={reviews.data.meta.current_page}
            lastPage={reviews.data.meta.last_page}
            hrefFor={(target) => reviewsHref(needsReply, target)}
          />
        </>
      )}
    </div>
  );
}