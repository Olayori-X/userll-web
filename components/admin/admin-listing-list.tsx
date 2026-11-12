"use client";

import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ImageOff, PackageSearch } from "lucide-react";
import { useAdminListings } from "@/hooks/use-admin";
import { toQueryString } from "@/lib/query-string";
import type { AdminListing } from "@/lib/types/admin-listings";
import type { ListingStatus } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

type TabStatus = ListingStatus | "all";

const TABS: { status: TabStatus; label: string }[] = [
  { status: "all", label: "All" },
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

export type ListingFilters = {
  status: TabStatus;
  search?: string;
  sellerId?: number;
};

function listingsHref({ status, search, sellerId }: ListingFilters, page = 1): string {
  return `/admin/listings${toQueryString({
    status: status === "all" ? undefined : status,
    search,
    seller: sellerId,
    page: page > 1 ? page : undefined,
  })}`;
}

function Row({ listing }: { listing: AdminListing }) {
  const look = STATUS_LOOK[listing.status];
  const photo = [...listing.images].sort((a, b) => a.position - b.position)[0]?.url ?? listing.image;
  // A suspended seller's listings are hidden from buyers whatever their own status says.
  const hidden = listing.status === "active" && listing.seller?.account_status === "suspended";

  return (
    <Link
      href={`/admin/listings/${listing.id}`}
      className="flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {photo ? (
          // alt is empty on purpose: the title next to it says what this is.
          <Image src={photo} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-5" aria-hidden />
          </span>
        )}
      </span>

      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="line-clamp-2 text-sm font-semibold">{listing.title}</p>

        <p className="truncate text-xs text-muted-foreground">
          {listing.price_short}
          {` · ${listing.stock} in stock`}
          {listing.seller && ` · ${listing.seller.store_name ?? listing.seller.name ?? "Unknown seller"}`}
        </p>

        {listing.status === "removed" && listing.removal_reason && (
          <p className="truncate text-xs text-destructive">Reason: {listing.removal_reason}</p>
        )}
        {hidden && <p className="text-xs font-medium text-warning">Hidden from buyers: the seller is suspended.</p>}
      </div>

      <span className={cn("hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-flex", look.classes)}>{look.label}</span>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

type AdminListingListProps = ListingFilters & { page: number };

/** Every listing, with a title search, and a tab per status. Each row opens the listing so it can be looked over. */
export function AdminListingList({ status, search, sellerId, page }: AdminListingListProps) {
  const filters: ListingFilters = { status, search, sellerId };
  const list = useAdminListings({ status: status === "all" ? undefined : status, search, sellerId, page });
  const narrowed = Boolean(search || sellerId);

  return (
    <div className="grid gap-5">
      {/* A plain form: it opens /admin/listings?search=..., with no code needed in the browser. */}
      <Form action="/admin/listings" role="search" className="flex gap-2">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        {sellerId && <input type="hidden" name="seller" value={sellerId} />}

        <input
          type="search"
          name="search"
          defaultValue={search}
          maxLength={100} // the API's limit
          placeholder="Search by title"
          aria-label="Search by title"
          autoComplete="off"
          className="h-10 w-full rounded-md border border-input bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 md:text-sm"
        />

        <Button type="submit">Search</Button>
      </Form>

      <nav aria-label="Filter listings">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const active = tab.status === status;

            return (
              <li key={tab.status} className="shrink-0">
                <Link
                  href={listingsHref({ ...filters, status: tab.status })}
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

      {narrowed && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm">
          <span className="text-muted-foreground">
            {sellerId && "Only one seller's listings. "}
            {search && `Matching "${search}". `}
          </span>
          <Link href={listingsHref({ status })} className="font-semibold text-primary hover:underline">
            Clear
          </Link>
        </p>
      )}

      {list.isPending && <PageSkeleton label="Loading listings" />}

      {list.isError && (
        <Alert variant="error" title="We couldn't load the listings">
          <Button variant="link" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {list.data && list.data.data.length === 0 && (
        <PageNotice icon={<PackageSearch className="size-7" aria-hidden />} title={page > 1 ? "Nothing on this page" : "No listings found"}>
          <p className="max-w-sm text-sm text-muted-foreground">
            {narrowed ? "Nothing matches that. Try a different spelling, or clear the filter." : "There are no listings with this status."}
          </p>
          {(page > 1 || narrowed) && (
            <Link href={listingsHref({ status })} className={buttonVariants({ size: "lg" })}>
              {narrowed ? "Clear the filter" : "Back to the first page"}
            </Link>
          )}
        </PageNotice>
      )}

      {list.data && list.data.data.length > 0 && (
        <>
          <ul
            className={cn(
              "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card transition-opacity",
              list.isPlaceholderData && "opacity-60",
            )}
          >
            {list.data.data.map((listing) => (
              <li key={listing.id}>
                <Row listing={listing} />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={list.data.meta.current_page}
            lastPage={list.data.meta.last_page}
            hrefFor={(target) => listingsHref(filters, target)}
          />
        </>
      )}
    </div>
  );
}