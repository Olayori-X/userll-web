import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ListingCard } from "@/components/listings/listing-card";
import { Pagination } from "@/components/listings/pagination";
import { ReviewList } from "@/components/sellers/review-list";
import { SellerHeader } from "@/components/sellers/seller-header";
import { Alert } from "@/components/ui/alert";
import { getSeller, getSellerReviews, searchListings, type ListingSort } from "@/lib/api/catalog";
import { PAGE_SIZE, SORT_OPTIONS } from "@/lib/listing-filters";
import { toQueryString } from "@/lib/query-string";
import type { StarRating } from "@/lib/types/reviews";
import { cn } from "@/lib/utils";

type SellerPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** A request that fails becomes null, and the page shows a note instead of an error screen. */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    console.error("Shop page data could not be loaded:", error);

    return null;
  }
}

/** The shop's address, read and cleaned: which tab, how the products are sorted, which page, which star filter. */
function readAddress(raw: Record<string, string | string[] | undefined>) {
  const tab = first(raw.tab) === "reviews" ? ("reviews" as const) : ("products" as const);

  const sortValue = first(raw.sort);
  const sort: ListingSort | undefined = sortValue === "price_asc" || sortValue === "price_desc" ? sortValue : undefined;

  const pageNumber = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(pageNumber) && pageNumber > 1 ? Math.min(pageNumber, 500) : 1;

  const ratingNumber = Number.parseInt(first(raw.rating) ?? "", 10);
  const rating = ratingNumber >= 1 && ratingNumber <= 5 ? (ratingNumber as StarRating) : undefined;

  return { tab, sort, page, rating };
}

function shopHref(slug: string, query: { tab?: "reviews"; sort?: ListingSort; page?: number } = {}): string {
  return `/sellers/${slug}${toQueryString({ tab: query.tab, sort: query.sort, page: query.page && query.page > 1 ? query.page : undefined })}`;
}

export async function generateMetadata({ params, searchParams }: SellerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const seller = await getSeller(slug);

  if (!seller) return { title: "Shop not found", robots: { index: false } };

  const { tab, sort, page, rating } = readAddress(await searchParams);
  const place = [seller.city, seller.state].filter(Boolean).join(", ");
  const description = seller.bio?.replace(/\s+/g, " ").trim().slice(0, 160) || `Shop ${seller.store_name} on Userll${place ? `, based in ${place}` : ""}.`;

  return {
    title: seller.store_name,
    description,
    // Only the plain first page of products belongs in search engines. Sorted, paged and review views are near-copies of it.
    robots: { index: tab === "products" && !sort && page === 1 && !rating },
  };
}

export default async function SellerPage({ params, searchParams }: SellerPageProps) {
  const { slug } = await params;
  const seller = await getSeller(slug); // unknown and suspended shops both give null

  if (!seller) notFound();

  const { tab, sort, page, rating } = readAddress(await searchParams);

  const listings =
    tab === "products"
      ? await orNull(searchListings({ seller: seller.slug, sort, page: page > 1 ? page : undefined, per_page: PAGE_SIZE }))
      : null;

  // An old link to a page that no longer exists: go to the last real page.
  if (listings && page > listings.meta.last_page) {
    redirect(shopHref(seller.slug, { sort, page: listings.meta.last_page }));
  }

  const reviews = tab === "reviews" ? await orNull(getSellerReviews(seller.slug, { rating, page })) : null;

  const tabClass = (active: boolean) =>
    cn(
      "-mb-px inline-block border-b-2 py-3 text-sm font-semibold transition-colors",
      active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SellerHeader seller={seller} />

      <nav aria-label="Shop sections" className="mt-6 border-b border-border">
        <ul className="flex gap-6">
          <li>
            <Link href={shopHref(seller.slug)} aria-current={tab === "products" ? "page" : undefined} className={tabClass(tab === "products")}>
              Products
            </Link>
          </li>
          <li>
            <Link
              href={shopHref(seller.slug, { tab: "reviews" })}
              aria-current={tab === "reviews" ? "page" : undefined}
              className={tabClass(tab === "reviews")}
            >
              Reviews{seller.reviews_count > 0 && ` (${seller.reviews_count})`}
            </Link>
          </li>
        </ul>
      </nav>

      <div className="mt-6">
        {tab === "products" && (
          <section aria-label="Products" className="grid gap-5">
            {listings === null && <Alert variant="error">We couldn&apos;t load this shop&apos;s products. Please try again in a moment.</Alert>}

            {listings && listings.data.length === 0 && (
              <div className="grid justify-items-center gap-1 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <p className="font-semibold">Nothing for sale right now</p>
                <p className="max-w-sm text-sm text-muted-foreground">Check back soon, or have a look at other shops.</p>
                <Link href="/listings" className="mt-2 text-sm font-semibold text-primary hover:underline">
                  Browse all products
                </Link>
              </div>
            )}

            {listings && listings.data.length > 0 && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {listings.meta.total} {listings.meta.total === 1 ? "product" : "products"}
                  </p>

                  <ul aria-label="Sort products" className="flex flex-wrap gap-2">
                    {SORT_OPTIONS.map((option) => {
                      const active = (sort ?? "newest") === option.value;

                      return (
                        <li key={option.value}>
                          <Link
                            href={shopHref(seller.slug, { sort: option.value === "newest" ? undefined : option.value })}
                            aria-current={active ? "true" : undefined}
                            className={cn(
                              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                              active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
                            )}
                          >
                            {option.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                  {listings.data.map((listing) => (
                    <li key={listing.id}>
                      <ListingCard listing={listing} className="h-full" />
                    </li>
                  ))}
                </ul>

                <Pagination
                  currentPage={listings.meta.current_page}
                  lastPage={listings.meta.last_page}
                  hrefFor={(target) => shopHref(seller.slug, { sort, page: target })}
                />
              </>
            )}
          </section>
        )}

        {tab === "reviews" && (
          <section aria-label="Reviews">
            {reviews === null ? (
              <Alert variant="error">We couldn&apos;t load this shop&apos;s reviews. Please try again in a moment.</Alert>
            ) : (
              <ReviewList reviews={reviews} slug={seller.slug} rating={rating} />
            )}
          </section>
        )}
      </div>
    </div>
  );
}