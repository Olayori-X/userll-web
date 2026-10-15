import Image from "next/image";
import Link from "next/link";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/money";
import type { CartItem } from "@/lib/types/cart";

const MAX_PER_LINE = 100; // the API's limit for one cart line

type CartLineProps = {
  item: CartItem;
  /** True while this line is being changed, so its buttons are off. */
  busy: boolean;
  /** What went wrong with the last change to this line, for example "Only 3 available." */
  error?: string | null;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

/** One row of the cart: picture, title, price, quantity, line total and remove. */
export function CartLine({ item, busy, error, onQuantityChange, onRemove }: CartLineProps) {
  // The listing was deleted: nothing to link to, and the amount cannot be changed. It can only be removed.
  const deleted = item.slug === null;

  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.image ? (
            // alt is empty on purpose: the title next to it says what this is.
            <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="grid min-w-0 content-start gap-1">
          {item.slug ? (
            <Link href={`/listings/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
              {item.title}
            </Link>
          ) : (
            <p className="line-clamp-2 text-sm font-medium text-muted-foreground">{item.title}</p>
          )}

          {!deleted && <p className="text-sm text-muted-foreground">{formatNaira(item.unit_price)} each</p>}

          {/* "No longer available" or "Only 3 left": the buyer must sort this out before checking out. */}
          {item.issue && (
            <p role="alert" className="text-xs font-semibold text-destructive">
              {item.issue}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        {!deleted && (
          <div
            role="group"
            aria-label={`Quantity for ${item.title}`}
            className="flex items-center rounded-md border border-input bg-card"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Decrease quantity"
              disabled={busy || item.quantity <= 1}
              onClick={() => onQuantityChange(item.quantity - 1)}
            >
              <Minus aria-hidden />
            </Button>
            <output aria-live="polite" className="min-w-9 text-center text-sm font-semibold">
              {item.quantity}
            </output>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Increase quantity"
              disabled={busy || item.quantity >= MAX_PER_LINE}
              onClick={() => onQuantityChange(item.quantity + 1)}
            >
              <Plus aria-hidden />
            </Button>
          </div>
        )}

        {!deleted && <p className="w-24 text-right text-sm font-bold">{formatNaira(item.line_total)}</p>}

        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${item.title}`} disabled={busy} onClick={onRemove}>
          <Trash2 className="text-muted-foreground" aria-hidden />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive sm:col-span-2">
          {error}
        </p>
      )}
    </li>
  );
}