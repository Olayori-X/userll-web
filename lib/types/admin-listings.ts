/** The admin's side of listings: finding them, looking one over, removing it and restoring it. */

import type { ListingCondition, ListingImage, ListingStatus, Location } from "@/lib/types/catalog";

/** One listing as an admin sees it. Amounts are KOBO, with `price_short` ready to show. */
export type AdminListing = {
  id: number;
  /** The listing's public address: /listings/{slug}. Only a live listing has a page there. */
  slug: string;
  title: string;
  description: string;
  price: number;
  /** "₦25.00k": the API's compact price text. */
  price_short: string;
  delivery_fee: number;
  condition: ListingCondition;
  stock: number;
  status: ListingStatus;
  location: Location;
  /** The category's NAME (not an object, unlike the public listing). */
  category: string | null;
  /** The first photo, or null. */
  image: string | null;
  images: ListingImage[];
  seller: {
    /** The seller's user id. */
    id: number;
    name: string | null;
    store_name: string | null;
    /**
     * "suspended" hides ALL of this seller's listings from buyers, whatever their own status says.
     * An admin looking at a listing marked "active" should know it may not be visible at all.
     */
    account_status: "active" | "suspended" | null;
  } | null;
  /** Set only while the listing is removed. */
  removed_at: string | null;
  /** Why it was removed. The SELLER reads this, so it says what to fix. Null unless removed. */
  removal_reason: string | null;
  created_at: string;
};