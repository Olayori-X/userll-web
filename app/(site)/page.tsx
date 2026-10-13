import Link from "next/link";
import { CategoryRow } from "@/components/home/category-row";
import { Hero } from "@/components/home/hero";
import { ListingCard } from "@/components/listings/listing-card";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getCategories, searchListings } from "@/lib/api/catalog";
import { cn } from "@/lib/utils";

/**
 * The landing page should open even when the API is down. A request that fails becomes null, and the
 * section that needed it shows a short note instead of the whole page failing.
 */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    console.error("Landing page data could not be loaded:", error);

    return null;
  }
}

export default async function HomePage() {
  // Asked for together, so the page waits for the slower one, not for both one after the other.
  const [categories, listings] = await Promise.all([
    orNull(getCategories()),
    orNull(searchListings({ sort: "newest", per_page: 12 })),
  ]);

  return (
    <>
      <Hero />

      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-16 sm:px-6 lg:px-8">
        {categories && <CategoryRow categories={categories} />}

        <section aria-labelledby="latest-heading" className="grid gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="latest-heading" className="text-xl font-bold tracking-tight">
              Just listed
            </h2>
            <Link href="/listings" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>

          {listings === null && (
            <Alert variant="warning">We couldn&apos;t load products right now. Please try again in a moment.</Alert>
          )}

          {listings && listings.data.length === 0 && (
            <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <p className="font-semibold">No listings yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">Be the first to put something up for sale.</p>
              <Link href="/sell" className={buttonVariants({ size: "sm" })}>
                Start selling
              </Link>
            </div>
          )}

          {listings && listings.data.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {listings.data.map((listing) => (
                <li key={listing.id}>
                  <ListingCard listing={listing} className="h-full" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid items-center gap-4 rounded-2xl bg-primary p-6 text-primary-foreground sm:grid-cols-[1fr_auto] sm:p-8">
          <div className="grid gap-1.5">
            <h2 className="text-xl font-bold tracking-tight">Have something to sell?</h2>
            <p className="max-w-lg text-sm text-primary-foreground/90">
              Open your shop on Userll, reach buyers, and get paid safely.
            </p>
          </div>
          <Link
            href="/sell"
            className={cn(buttonVariants({ size: "lg" }), "bg-background text-foreground hover:bg-background/90")}
          >
            Start selling
          </Link>
        </section>
      </div>
    </>
  );
}