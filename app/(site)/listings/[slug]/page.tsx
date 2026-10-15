"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lock, Minus, Plus } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAddToCart } from "@/hooks/use-cart";
import { formatNaira } from "@/lib/money";
import type { Listing } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const MAX_PER_LINE = 100; // the API's limit for one cart line

type PurchasePanelProps = {
  listing: Listing;
};

/** Price, delivery, stock, quantity, and the two ways to buy. */
export function PurchasePanel({ listing }: PurchasePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status } = useSession();
  const add = useAddToCart();
  const quantityLabelId = useId();

  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState<"add" | "buy" | null>(null);
  /** How many were just added, to confirm it. Cleared as soon as anything changes. */
  const [justAdded, setJustAdded] = useState<number | null>(null);

  const forSale = listing.status === "active" && listing.stock > 0;
  const maxQuantity = Math.min(listing.stock, MAX_PER_LINE);
  const emailUnverified = Boolean(user && !user.email_verified);
  const lowStock = listing.stock <= 5;

  const delivery = listing.delivery_fee === 0 ? "Free delivery" : `Delivery ${formatNaira(listing.delivery_fee)}`;

  function changeQuantity(next: number) {
    setQuantity(Math.min(Math.max(next, 1), maxQuantity));
    setJustAdded(null);
    add.reset();
  }

  function buy(kind: "add" | "buy") {
    // Logged out: log in first, and come straight back to this listing afterwards.
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);

      return;
    }

    setAction(kind);
    setJustAdded(null);

    add.mutate(
      { listingId: listing.id, quantity },
      {
        onSuccess: () => {
          if (kind === "buy") router.push("/cart");
          else setJustAdded(quantity);
        },
      },
    );
  }

  // The API names the field that is wrong: "You cannot buy your own listing." or "Only 3 available."
  const error = add.error;
  const errorMessage =
    error instanceof ApiError
      ? (error.fieldError("listing_id") ?? error.fieldError("quantity") ?? error.message)
      : error
        ? "Something went wrong. Please try again."
        : null;

  const busy = add.isPending || (add.isSuccess && action === "buy"); // after Buy now, stay busy until the cart page opens
  const blocked = !forSale || emailUnverified || status === "loading" || busy;

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <p className="text-3xl font-extrabold tracking-tight">{formatNaira(listing.price)}</p>
        <p className="text-sm text-muted-foreground">{delivery}</p>
      </div>

      {forSale ? (
        <p className={cn("text-sm font-semibold", lowStock ? "text-warning" : "text-success")}>
          {lowStock ? `Only ${listing.stock} left` : "In stock"}
        </p>
      ) : (
        <Alert variant="info">
          {listing.status === "sold_out" || listing.stock < 1
            ? "This listing is sold out."
            : "This listing is not available right now."}
        </Alert>
      )}

      {forSale && listing.stock > 1 && (
        <div className="flex items-center gap-3">
          <span id={quantityLabelId} className="text-sm font-semibold">
            Quantity
          </span>

          <div role="group" aria-labelledby={quantityLabelId} className="flex items-center rounded-md border border-input bg-card">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Decrease quantity"
              disabled={quantity <= 1 || busy}
              onClick={() => changeQuantity(quantity - 1)}
            >
              <Minus aria-hidden />
            </Button>
            <output aria-live="polite" className="min-w-10 text-center text-sm font-semibold">
              {quantity}
            </output>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Increase quantity"
              disabled={quantity >= maxQuantity || busy}
              onClick={() => changeQuantity(quantity + 1)}
            >
              <Plus aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {emailUnverified && (
        <Alert variant="warning">
          Verify your email to buy.{" "}
          <Link href={`/verify-email?next=${encodeURIComponent(pathname)}`} className="font-semibold underline">
            Verify now
          </Link>
        </Alert>
      )}

      {justAdded !== null && (
        <Alert variant="success">
          {justAdded === 1 ? "Added to your cart." : `${justAdded} added to your cart.`}{" "}
          <Link href="/cart" className="font-semibold underline">
            View cart
          </Link>
        </Alert>
      )}

      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Button variant="outline" size="lg" disabled={blocked} loading={add.isPending && action === "add"} onClick={() => buy("add")}>
          Add to cart
        </Button>
        <Button size="lg" disabled={blocked} loading={busy && action === "buy"} onClick={() => buy("buy")}>
          Buy now
        </Button>
      </div>

      {!user && status === "unauthenticated" && forSale && (
        <p className="text-center text-xs text-muted-foreground">You&apos;ll be asked to log in first.</p>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Pay safely: we hold your money until your order arrives.
      </p>
    </div>
  );
}