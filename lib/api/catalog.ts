/**
 * The public catalog: categories, listing search, one listing, a seller's shop page.
 *
 * Server only (it uses lib/api-server.ts). Pages call these while they are being built, so the HTML arrives
 * with the products already in it. Public data, so each answer may be reused for a short while.
 */

import { serverGet, serverGetOrNull } from "@/lib/api-server";
import type { Category, Listing, ListingCard, ListingCondition, SellerSummary } from "@/lib/types/catalog";
import type { Paginated, Wrapped } from "@/lib/types/common";

export type ListingSort = "newest" | "price_asc" | "price_desc";

/** The filters the API understands. Anything left out is simply not applied. */
export type ListingSearch = {
  /** Search text, 100 characters at most. */
  q?: string;
  /** A category slug. A top-level category also includes everything in its sub-categories. */
  category?: string;
  /** A seller's shop slug. */
  seller?: string;
  condition?: ListingCondition;
  state?: string;
  city?: string;
  /** NAIRA as text, such as "1000" or "100.5k". These two are in naira, not kobo, like a listing's own price. */
  min_price?: string;
  max_price?: string;
  sort?: ListingSort;
  page?: number;
  /** 1 to 50. The API's default is 24. */
  per_page?: number;
};

/** The category tree: top-level categories, each with its sub-categories. Changes rarely, so kept for 5 minutes. */
export async function getCategories(): Promise<Category[]> {
  const { data } = await serverGet<Wrapped<Category[]>>("/categories", { revalidate: 300 });

  return data;
}

/** One page of listings. Kept for a minute, so a busy landing page does not hit the API on every visit. */
export function searchListings(search: ListingSearch = {}): Promise<Paginated<ListingCard>> {
  return serverGet<Paginated<ListingCard>>("/listings", { query: search, revalidate: 60 });
}

/** One listing by its slug, or null when there is no such public listing (the page should call notFound()). */
export async function getListing(slug: string): Promise<Listing | null> {
  const result = await serverGetOrNull<Wrapped<Listing>>(`/listings/${encodeURIComponent(slug)}`, { revalidate: 30 });

  return result?.data ?? null;
}

/** A seller's public shop details by slug, or null. Their products come from searchListings({ seller: slug }). */
export async function getSeller(slug: string): Promise<SellerSummary | null> {
  const result = await serverGetOrNull<Wrapped<SellerSummary>>(`/sellers/${encodeURIComponent(slug)}`, { revalidate: 60 });

  return result?.data ?? null;
}