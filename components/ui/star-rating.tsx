import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

type StarRatingProps = {
  /** 0 to 5. A fraction such as 4.6 is rounded to the nearest whole star for the picture, but read out as given. */
  rating: number;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Read-only stars: "4 out of 5" as four filled stars and one empty. For choosing a rating, see the review form. */
export function StarRating({ rating, size = "md", className }: StarRatingProps) {
  const clamped = Math.min(Math.max(rating, 0), 5);
  const filled = Math.round(clamped);
  const spoken = Number.isInteger(clamped) ? String(clamped) : clamped.toFixed(1);

  return (
    <span role="img" aria-label={`${spoken} out of 5 stars`} className={cn("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(SIZES[size], n <= filled ? "fill-warning text-warning" : "text-border")} aria-hidden />
      ))}
    </span>
  );
}
