import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SearchX } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { ListingFilters } from "@/components/listings/listing-filters";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getCategories, searchListings, type ListingSearch } from "@/lib/api/catalog";
import { hasActiveFilters, knownCategorySlugs, listingsHref, PAGE_SIZE, parseListingFilters } from "@/lib/listing-filters";
import type { Category } from "@/lib/types/catalog";
import type { Paginated } from "@/lib/types/common";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The parts of the address this page understands. Anything else in it is left alone. */
const KNOWN_KEYS = ["q", "category", "condition", "min_price", "max_price", "sort", "page"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** A request that fails becomes null, and the page shows a note instead of an error screen. */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    console.error("Browse page data could not be loaded:", error);

    return null;
  }
}

/** The address, read and cleaned. The categories are cached, so asking twice (page and title) costs nothing extra. */
async function readAddress(searchParams: SearchParams) {
  const raw = await searchParams;
  const categories = (await orNull(getCategories())) ?? [];
  const filters = parseListingFilters(raw, knownCategorySlugs(categories));

  return { raw, categories, filters };
}

function findCategoryName(categories: Category[], slug: string | undefined): string | null {
  if (!slug) return null;

  for (const category of categories) {
    if (category.slug === slug) return category.name;

    const child = category.children.find((item) => item.slug === slug);
    if (child) return child.name;
  }

  return null;
}

function headingFor(filters: ListingSearch, categories: Category[]): string {
  if (filters.q) return `Results for “${filters.q}”`;

  return findCategoryName(categories, filters.category) ?? "All products";
}

function summaryText(meta: Paginated<unknown>["meta"]): string {
  const total = meta.total.toLocaleString("en-NG");

  if (meta.total === 0) return "No results";
  if (meta.last_page === 1) return `${total} ${meta.total === 1 ? "result" : "results"}`;

  return `Showing ${meta.from ?? 1}–${meta.to ?? meta.total} of ${total}`;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { categories, filters } = await readAddress(searchParams);

  // The plain list and plain category pages belong in search engines. Searches, filtered and sorted views
  // and later pages are near-copies of them, so they are kept out.
  const isPlain = !(filters.q || filters.condition || filters.min_price || filters.max_price || filters.sort || filters.page);

  return { title: headingFor(filters, categories), robots: { index: isPlain } };
}

export default async function ListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { raw, categories, filters } = await readAddress(searchParams);

  // Tidy the address: "?condition=&sort=newest&page=1" becomes "/listings", "25,000" becomes "25000", and so on.
  // One search then has exactly one address, which is what search engines and shared links want.
  const canonical = listingsHref(filters);
  const canonicalParams = new URLSearchParams(canonical.split("?")[1] ?? "");

  const untidy = KNOWN_KEYS.some((key) => {
    const given = first(raw[key]);

    return given !== undefined && given !== canonicalParams.get(key);
  });

  if (untidy) redirect(canonical);

  const results = await orNull(searchListings({ ...filters, per_page: PAGE_SIZE }));

  // An old link to a page that no longer exists: go to the last real page.
  if (results && filters.page && filters.page > results.meta.last_page) {
    redirect(listingsHref(filters, { page: results.meta.last_page }));
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{headingFor(filters, categories)}</h1>
        {results && <p className="text-sm text-muted-foreground">{summaryText(results.meta)}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <ListingFilters filters={filters} categories={categories} />

        <div className="grid content-start gap-6">
          {results === null && (
            <Alert variant="error" title="We couldn't load the results">
              Something went wrong on our side.{" "}
              <Link href={canonical} className="font-semibold underline">
                Try again
              </Link>
            </Alert>
          )}

          {results && results.data.length === 0 && (
            <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <SearchX className="size-9 text-muted-foreground" aria-hidden />

              {hasActiveFilters(filters) ? (
                <>
                  <p className="font-semibold">Nothing matches that</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Try fewer filters, a wider price range, or a different search.
                  </p>
                  <Link href="/listings" className={buttonVariants({ size: "sm" })}>
                    Clear filters
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-semibold">No listings yet</p>
                  <p className="max-w-sm text-sm text-muted-foreground">Be the first to put something up for sale.</p>
                  <Link href="/sell" className={buttonVariants({ size: "sm" })}>
                    Start selling
                  </Link>
                </>
              )}
            </div>
          )}

          {results && results.data.length > 0 && (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {results.data.map((listing) => (
                  <li key={listing.id}>
                    <ListingCard listing={listing} className="h-full" />
                  </li>
                ))}
              </ul>

              <Pagination
                currentPage={results.meta.current_page}
                lastPage={results.meta.last_page}
                hrefFor={(page) => listingsHref(filters, { page })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}