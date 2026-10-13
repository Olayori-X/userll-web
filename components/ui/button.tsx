import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** The main action: filled red ("Buy Now", "Place Order"). */
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        /** The second action: red outline ("Add to Cart", "Track Order"). */
        outline: "border border-primary bg-transparent text-primary hover:bg-accent",
        /** Quiet fill: peach ("Contact Seller", filters). */
        secondary: "bg-secondary text-accent-foreground hover:bg-accent",
        /** No box until hovered: toolbars, menu triggers. */
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        /** Destructive: delete, remove, reject. A deeper red than the brand colour, so they are not confused. */
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        /** Looks like a link. */
        link: "h-auto p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 px-2.5 text-xs",
        sm: "h-9 px-3",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner and blocks clicks. Use it on anything that sends a request, so nothing is submitted twice. */
    loading?: boolean;
  };

/**
 * For a link that should look like a button, do not nest a link in a button. Put the styles on the link:
 *   <Link href="/cart" className={buttonVariants({ variant: "outline" })}>View cart</Link>
 *
 * A button that has only an icon needs an aria-label so screen readers can say what it does.
 */
export function Button({ className, variant, size, loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      {...props}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <LoaderCircle className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}