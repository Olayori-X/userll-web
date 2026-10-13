/** What the public catalog endpoints return: categories, listing cards (search results) and listing pages. */

export type ListingCondition = "new" | "used";

/** Drafts, sold-out and removed listings only ever appear to their owner, or to an admin. */
export type ListingStatus = "draft" | "active" | "sold_out" | "removed";

export type Subcategory = {
  id: number;
  name: string;
  slug: string;
};

/** Categories are two levels deep: a top-level category and its sub-categories. */
export type Category = Subcategory & {
  children: Subcategory[];
};

export type Location = {
  city: string | null;
  state: string | null;
};

export type ListingImage = {
  id: number;
  /** Full address of the picture. Showing it with next/image needs this host listed in next.config. */
  url: string;
  position: number;
};

/**
 * One listing in a grid: search results, a seller's shop, "newest" on the landing page.
 *
 * Amounts follow the API's rule: `price` and `delivery_fee` are KOBO (whole numbers, for maths), and
 * the `_formatted` / `_short` texts are ready to show. A card has little room, so use `price_short`
 * ("₦100.50k"). Use `price_formatted` where there is space (the listing page).
 */
export type ListingCard = {
  id: number;
  slug: string;
  title: string;
  price: number;
  price_formatted: string;
  price_short: string;
  /** 0 means free delivery. */
  delivery_fee: number;
  delivery_fee_formatted: string;
  condition: ListingCondition;
  location: Location;
  /** The first picture, or null when the seller added none. */
  image: string | null;
  store_name: string | null;
  store_slug: string | null;
};

/** The public face of a seller: shown on listing pages and on their shop page. */
export type SellerSummary = {
  store_name: string;
  slug: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  /** True once the seller's identity has been checked by an admin. */
  is_verified: boolean;
  reviews_count: number;
  /** 0 when there are no reviews yet. Check reviews_count before showing stars. */
  rating_average: number;
  /** A date, "2026-03-14". */
  member_since: string;
};

/** A full listing page. */
export type Listing = {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  price_formatted: string;
  price_short: string;
  delivery_fee: number;
  delivery_fee_formatted: string;
  condition: ListingCondition;
  /** How many are left. */
  stock: number;
  status: ListingStatus;
  /** Only present when an admin removed the listing, and only the owner or an admin sees that listing. */
  removal_reason?: string;
  location: Location;
  category: Subcategory;
  images: ListingImage[];
  /** Null if the seller's profile no longer exists. */
  seller: SellerSummary | null;
  /** A timestamp, "2026-03-14T09:30:00+00:00". */
  created_at: string;
};