/** A seller's own listings: the product table, and what to send to create or change one. */

import type { Listing, ListingCondition, Subcategory } from "@/lib/types/catalog";

/**
 * A listing as the seller's own screens get it. The seller's LIST has no `category` or `seller` (they are not loaded
 * there), while one listing fetched, created or changed does have its category. The public listing's fields apply:
 * amounts are kobo with `_formatted` texts, `status` and `stock` are always present for the seller.
 */
export type SellerListing = Omit<Listing, "category" | "seller"> & {
  category?: Subcategory;
};

/**
 * What the seller fills in. Note the units: `price` and `delivery_fee` are NAIRA as text ("25000", "25000.50"),
 * unlike everything else in the app, which is kobo. Convert with `nairaForApi` from lib/money.ts.
 */
export type ListingInput = {
  category_id: number;
  /** 5 to 120 characters. */
  title: string;
  /** 20 to 5000 characters. */
  description: string;
  /** Naira. At least ₦100 and at most ₦100,000,000 (server settings). */
  price: string;
  /** Naira. Leave it out, or send "0", for free delivery. At most ₦50,000 (a server setting). */
  delivery_fee?: string;
  condition: ListingCondition;
  /** A whole number, 0 to 100,000. A stock of 0 makes a live listing "sold out". */
  stock: number;
  city: string;
  state: string;
};

/** Creating a listing can attach its first photos in the same request. The listing starts as a draft. */
export type NewListingInput = ListingInput & {
  /** Up to 8 pictures (JPG, PNG or WebP, up to 5 MB each, at least 400 × 400 pixels). */
  images?: File[];
};

/** Changing a listing: send only what changed. Photos are changed on their own, not here. */
export type ListingChanges = Partial<ListingInput>;

/** The most photos one listing can have (a server setting). */
export const MAX_LISTING_PHOTOS = 8;