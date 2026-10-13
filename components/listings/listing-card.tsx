import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { ListingCard as ListingCardData } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  listing: ListingCardData;
  className?: string;
};

/**
 * One listing in a grid. The whole card is a single link to the listing page.
 * It has no client code, so it renders on the server like the rest of the catalog.
 */
export function ListingCard({ listing, className }: ListingCardProps) {
  const place = [listing.location.city, listing.location.state].filter(Boolean).join(", ");
  const seller = [listing.store_name, place].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card outline-none transition-shadow",
        "hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {listing.image ? (
          // alt is empty on purpose: the title right below says what this is, so a screen reader need not say it twice.
          <Image
            src={listing.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}

        {listing.condition === "used" && (
          <span className="absolute top-2 left-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-background">
            Used
          </span>
        )}
      </div>

      <div className="grid gap-1 p-3">
        {/* Two lines tall even for a short title, so cards in a row line up. */}
        <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-medium">{listing.title}</h3>

        <p className="text-base font-bold">{listing.price_short}</p>

        {listing.delivery_fee === 0 && <p className="text-xs font-medium text-success">Free delivery</p>}

        {seller && <p className="truncate text-xs text-muted-foreground">{seller}</p>}
      </div>
    </Link>
  );
}