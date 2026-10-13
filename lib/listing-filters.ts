/**
 * The browse page's filters: read from the address, cleaned, and turned back into addresses.
 *
 * Pure code, no Next.js. Every filter lives in the address (/listings?category=shoes&sort=price_asc), so a
 * search can be shared, bookmarked and read by search engines. Anything that is not valid is dropped quietly
 * instead of being sent to the API (which would answer with an error page for a hand-edited link).
 */

import type { ListingSearch, ListingSort } from "@/lib/api/catalog";
import { nairaForApi, nairaToKobo } from "@/lib/money";
import { toQueryString } from "@/lib/query-string";
import type { Category } from "@/lib/types/catalog";

export const PAGE_SIZE = 24;

export const SORT_OPTIONS: { value: ListingSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const DEFAULT_SORT: ListingSort = "newest";
const MAX_PAGE = 500;
/** ₦9,999,999,999.99, the most the API accepts for a price. */
const MAX_KOBO = 999_999_999_999;

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Every category and sub-category slug that exists, to check ?category= against. */
export function knownCategorySlugs(categories: Category[]): Set<string> {
  return new Set(categories.flatMap((category) => [category.slug, ...category.children.map((child) => child.slug)]));
}

/** A price typed in naira -> the text the API expects, or undefined if it is not a usable amount. */
function cleanPrice(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const kobo = nairaToKobo(value);
  if (kobo === null || kobo > MAX_KOBO) return undefined;

  return nairaForApi(value) ?? undefined;
}

/**
 * The address's filters, cleaned. Leaves out sort when it is the default ("newest") and page when it is 1,
 * so the same search always has the same address.
 */
export function parseListingFilters(raw: RawParams, categorySlugs: Set<string>): ListingSearch {
  const filters: ListingSearch = {};

  const q = first(raw.q)?.trim().slice(0, 100); // the API's limit
  if (q) filters.q = q;

  const category = first(raw.category);
  if (category && categorySlugs.has(category)) filters.category = category;

  const condition = first(raw.condition);
  if (condition === "new" || condition === "used") filters.condition = condition;

  const minPrice = cleanPrice(first(raw.min_price));
  if (minPrice) filters.min_price = minPrice;

  const maxPrice = cleanPrice(first(raw.max_price));
  if (maxPrice) filters.max_price = maxPrice;

  const sort = first(raw.sort);
  if (sort === "price_asc" || sort === "price_desc") filters.sort = sort;

  const page = Number.parseInt(first(raw.page) ?? "", 10);
  if (Number.isInteger(page) && page > 1) filters.page = Math.min(page, MAX_PAGE);

  return filters;
}

/**
 * The address for a set of filters, with some of them changed:
 *
 *   listingsHref(filters, { category: "shoes" })       // pick a category
 *   listingsHref(filters, { condition: undefined })    // clear one
 *   listingsHref(filters, { page: 3 })                 // go to page 3
 *
 * Changing any filter goes back to page 1. Only a change that itself sets `page` keeps a page number.
 */
export function listingsHref(filters: ListingSearch, changes: Partial<ListingSearch> = {}): string {
  const merged: ListingSearch = { ...filters, ...changes };

  if (!("page" in changes)) delete merged.page;

  return `/listings${toQueryString({
    q: merged.q,
    category: merged.category,
    condition: merged.condition,
    min_price: merged.min_price,
    max_price: merged.max_price,
    sort: merged.sort === DEFAULT_SORT ? undefined : merged.sort,
    page: merged.page && merged.page > 1 ? merged.page : undefined,
  })}`;
}

/** True when anything other than the sort order narrows the results, to decide whether to show "Clear filters". */
export function hasActiveFilters(filters: ListingSearch): boolean {
  return Boolean(filters.q || filters.category || filters.condition || filters.min_price || filters.max_price);
}