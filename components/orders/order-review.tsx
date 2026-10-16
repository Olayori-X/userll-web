"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { useCreateReview, useMyReview } from "@/hooks/use-orders";
import { formatDay } from "@/lib/dates";
import { applyApiErrors } from "@/lib/form-errors";
import type { OwnReview } from "@/lib/types/orders";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

const COMMENT_MAX = 1000; // the API's limit
const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"] as const;

const reviewSchema = z.object({
  // Radio buttons give text, so it is checked as text and turned into a number when sent.
  rating: z.string().regex(/^[1-5]$/, "Choose a rating from 1 to 5 stars."),
  comment: z.string().trim().max(COMMENT_MAX, `Please keep it under ${COMMENT_MAX} characters.`),
});

type ReviewValues = z.infer<typeof reviewSchema>;

/** Read-only stars: 4 of 5 filled. */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= rating ? "fill-warning text-warning" : "text-border")} aria-hidden />
      ))}
    </span>
  );
}

function SavedReview({ review }: { review: OwnReview }) {
  const posted = formatDay(review.created_at);
  const replied = formatDay(review.seller_replied_at);

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-bold">Your review</h2>

      <div className="grid gap-2 rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars rating={review.rating} />
          <span className="text-sm font-medium">{LABELS[review.rating - 1]}</span>
          {posted && <span className="text-xs text-muted-foreground">{posted}</span>}
        </div>

        {review.comment ? (
          <p className="text-sm leading-relaxed break-words whitespace-pre-line">{review.comment}</p>
        ) : (
          <p className="text-sm text-muted-foreground">You didn&apos;t write a comment.</p>
        )}

        {review.seller_reply && (
          <div className="mt-1 grid gap-1 border-l-2 border-primary/40 pl-3">
            <p className="text-xs font-semibold">
              Seller&apos;s reply{replied && <span className="font-normal text-muted-foreground"> · {replied}</span>}
            </p>
            <p className="text-sm break-words whitespace-pre-line">{review.seller_reply}</p>
          </div>
        )}
      </div>

      {review.is_hidden && (
        <Alert variant="warning" title="This review is hidden from the public">
          {review.hidden_reason ?? "It didn't follow our review guidelines."}
        </Alert>
      )}
    </div>
  );
}

type ReviewFormProps = {
  orderNumber: string;
  storeName?: string;
  /** The API said this order was already reviewed (another tab, another device): go and fetch that review. */
  onAlreadyReviewed: () => void;
};

function ReviewForm({ orderNumber, storeName, onAlreadyReviewed }: ReviewFormProps) {
  const create = useCreateReview();
  const [formError, setFormError] = useState<string | null>(null);
  const [hover, setHover] = useState(0);

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: "", comment: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = form;

  const selected = Number(watch("rating")) || 0;
  const shown = hover || selected;
  const length = watch("comment")?.length ?? 0;

  const submit = handleSubmit((values) => {
    setFormError(null);

    create.mutate(
      {
        orderNumber,
        input: { rating: Number(values.rating), ...(values.comment ? { comment: values.comment } : {}) },
      },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.fieldError("order")?.includes("already")) onAlreadyReviewed();

          setFormError(applyApiErrors(error, setError, ["rating", "comment"]));
        },
      },
    );
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-lg font-bold">How was your order{storeName ? ` from ${storeName}` : ""}?</h2>
        <p className="text-sm text-muted-foreground">
          Your review helps other buyers. You can only review an order once, and it can&apos;t be changed afterwards.
        </p>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-sm font-semibold">Your rating</legend>

        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHover(n)}
              className="cursor-pointer rounded-sm p-0.5 has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
            >
              <input
                type="radio"
                value={String(n)}
                className="sr-only"
                aria-label={`${n} ${n === 1 ? "star" : "stars"}: ${LABELS[n - 1]}`}
                {...register("rating")}
              />
              <Star
                className={cn("size-8 transition-colors", n <= shown ? "fill-warning text-warning" : "text-border")}
                aria-hidden
              />
            </label>
          ))}

          <span className="ml-2 text-sm text-muted-foreground" aria-live="polite">
            {shown ? LABELS[shown - 1] : ""}
          </span>
        </div>

        {errors.rating && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.rating.message}
          </p>
        )}
      </fieldset>

      <FormField label="Comment" optional error={errors.comment?.message}>
        {(control) => (
          <>
            <Textarea
              maxLength={COMMENT_MAX}
              placeholder="Was it as described? How was the packaging and delivery?"
              {...register("comment")}
              {...control}
            />
            <p className="text-right text-xs text-muted-foreground" aria-hidden>
              {length} / {COMMENT_MAX}
            </p>
          </>
        )}
      </FormField>

      <Button type="submit" className="justify-self-start" loading={create.isPending}>
        Post review
      </Button>
    </form>
  );
}

type OrderReviewProps = {
  orderNumber: string;
  /** The seller's shop name, for the heading. */
  storeName?: string;
};

/** Shown on a completed order: the review form, or the buyer's own review once it exists. */
export function OrderReview({ orderNumber, storeName }: OrderReviewProps) {
  const review = useMyReview(orderNumber);

  if (review.isPending) {
    return (
      <div className="h-28 animate-pulse rounded-lg bg-muted" role="status">
        <span className="sr-only">Loading your review</span>
      </div>
    );
  }

  if (review.isError) {
    return (
      <Alert variant="error" title="We couldn't load your review">
        <Button variant="link" onClick={() => void review.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  if (review.data) return <SavedReview review={review.data} />;

  return <ReviewForm orderNumber={orderNumber} storeName={storeName} onAlreadyReviewed={() => void review.refetch()} />;
}