"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ImageOff, Package } from "lucide-react";
import { useSellerListings } from "@/hooks/use-seller-listings";
import { formatNaira } from "@/lib/money";
import { toQueryString } from "@/lib/query-string";
import type { ListingStatus } from "@/lib/types/catalog";
import type { SellerListing } from "@/lib/types/seller-listings";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

const TABS: { status: ListingStatus | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "active", label: "Active" },
  { status: "draft", label: "Drafts" },
  { status: "sold_out", label: "Sold out" },
  { status: "removed", label: "Removed" },
];

const STATUS_LOOK: Record<ListingStatus, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-success-soft text-success" },
  draft: { label: "Draft", classes: "bg-muted text-muted-foreground" },
  sold_out: { label: "Sold out", classes: "bg-warning-soft text-warning" },
  removed: { label: "Removed", classes: "bg-danger-soft text-destructive" },
};

/** The same columns for the header and every row, from tablets up. On phones, price and stock sit under the title. */
const GRID = "grid grid-cols-[auto_1fr_auto] items-center gap-3 md:grid-cols-[auto_1fr_7rem_5rem_6.5rem_1rem]";

function productsHref(status: ListingStatus | undefined, page = 1): string {
  return `/seller/listings${toQueryString({ status, page: page > 1 ? page : undefined })}`;
}

function Row({ listing }: { listing: SellerListing }) {
  const look = STATUS_LOOK[listing.status];
  const photo = [...listing.images].sort((a, b) => a.position - b.position)[0]?.url;
  const lowStock = listing.status === "active" && listing.stock > 0 && listing.stock <= 5;

  return (
    <Link
      href={`/seller/listings/${listing.id}`}
      className={cn(GRID, "px-4 py-3 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40")}
    >
      <span className="relative size-14 overflow-hidden rounded-lg bg-muted">
        {photo ? (
          // alt is empty on purpose: the title next to it says what this is.
          <Image src={photo} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-5" aria-hidden />
          </span>
        )}
      </span>

      <span className="grid min-w-0 gap-0.5">
        <span className="line-clamp-2 text-sm font-semibold">{listing.title}</span>

        <span className="text-xs text-muted-foreground md:hidden">
          {formatNaira(listing.price)} · {listing.stock} in stock
        </span>

        {listing.status === "removed" && listing.removal_reason && (
          <span className="text-xs font-medium text-destructive">Removed by an admin: {listing.removal_reason}</span>
        )}
        {listing.status === "draft" && listing.images.length === 0 && (
          <span className="text-xs font-medium text-warning">Add a photo to publish</span>
        )}
      </span>

      <span className="hidden text-sm font-semibold md:block">
        <span className="sr-only">Price: </span>
        {formatNaira(listing.price)}
      </span>

      <span className={cn("hidden text-sm md:block", lowStock && "font-semibold text-warning")}>
        <span className="sr-only">In stock: </span>
        {listing.stock}
      </span>

      <span className={cn("inline-flex w-fit items-center justify-self-end rounded-full px-2.5 py-0.5 text-xs font-semibold md:justify-self-start", look.classes)}>
        {look.label}
      </span>

      <ChevronRight className="hidden size-4 text-muted-foreground md:block" aria-hidden />
    </Link>
  );
}

type ProductsViewProps = {
  /** From the address, already checked against the real statuses. */
  status?: ListingStatus;
  page: number;
};

export function ProductsView({ status, page }: ProductsViewProps) {
  const listings = useSellerListings({ status, page });

  return (
    <div className="grid gap-5">
      <nav aria-label="Filter products">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const active = tab.status === status;

            return (
              <li key={tab.label} className="shrink-0">
                <Link
                  href={productsHref(tab.status)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {listings.isPending && <PageSkeleton label="Loading your products" />}

      {listings.isError && (
        <Alert variant="error" title="We couldn't load your products">
          <Button variant="link" onClick={() => void listings.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {listings.data && listings.data.data.length === 0 && (
        <PageNotice
          icon={<Package className="size-7" aria-hidden />}
          title={status ? "Nothing here" : page > 1 ? "Nothing on this page" : "No products yet"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {status
              ? "You have no products with this status."
              : page > 1
                ? "There are no products on this page."
                : "Add photos, a price and your delivery fee, then publish it. You can start selling right away."}
          </p>

          {status || page > 1 ? (
            <Link href="/seller/listings" className={buttonVariants({ size: "lg" })}>
              Show all products
            </Link>
          ) : (
            <Link href="/seller/listings/new" className={buttonVariants({ size: "lg" })}>
              Add your first product
            </Link>
          )}
        </PageNotice>
      )}

      {listings.data && listings.data.data.length > 0 && (
        <>
          <div className={cn("overflow-hidden rounded-xl border border-border bg-card transition-opacity", listings.isPlaceholderData && "opacity-60")}>
            <div aria-hidden className={cn(GRID, "hidden border-b border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground md:grid")}>
              <span className="w-14" />
              <span>Product</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Status</span>
              <span />
            </div>

            <ul className="divide-y divide-border">
              {listings.data.data.map((listing) => (
                <li key={listing.id}>
                  <Row listing={listing} />
                </li>
              ))}
            </ul>
          </div>

          <Pagination
            currentPage={listings.data.meta.current_page}
            lastPage={listings.data.meta.last_page}
            hrefFor={(target) => productsHref(status, target)}
          />
        </>
      )}
    </div>
  );
}