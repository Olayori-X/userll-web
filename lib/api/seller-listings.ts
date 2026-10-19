/**
 * The seller's own listings: every one of theirs, drafts and sold-out ones included.
 * Needs a seller (a shop, a verified email).
 *
 * This file will grow when we build the products pages: create, edit, photos, publish and unpublish.
 */

import { api } from "@/lib/api";
import type { ListingCard, ListingStatus } from "@/lib/types/catalog";
import type { Paginated } from "@/lib/types/common";

export type SellerListingFilter = {
  /** Only listings in this state. Leave it out for all of them. */
  status?: ListingStatus;
  page?: number;
};

/** The seller's listings, newest first, 24 to a page. `meta.total` is how many there are in all. */
export function getSellerListings({ status, page = 1 }: SellerListingFilter = {}) {
  return api.get<Paginated<ListingCard>>("/seller/listings", { query: { status, page: page > 1 ? page : undefined } });
}