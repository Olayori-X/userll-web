/**
 * The seller's own listings: the list, one listing, creating, changing, publishing, photos, deleting.
 * Needs a seller (a shop, a verified email). A seller's listings are addressed by their ID, not by the public slug.
 *
 * Every change answers with the whole updated listing, so the screen can replace what it has.
 * Photo and publishing problems come back as field errors: `images` ("Add at least one photo before publishing.",
 * "This listing already has the maximum of 8 photos.", "A live listing must keep at least one photo. Unpublish it first."),
 * `stock` ("Set stock above zero before publishing."), and `status` ("This listing was removed by an admin.").
 */

import { api } from "@/lib/api";
import type { ListingStatus } from "@/lib/types/catalog";
import type { Paginated, Wrapped } from "@/lib/types/common";
import type { ListingChanges, NewListingInput, SellerListing } from "@/lib/types/seller-listings";

const unwrap = <T>({ data }: Wrapped<T>) => data;

const path = (id: number) => `/seller/listings/${id}`;

export type SellerListingFilter = {
  /** Only listings in this state. Leave it out for all of them. */
  status?: ListingStatus;
  page?: number;
};

/** The seller's listings with each one's status and stock, newest first, 24 to a page. `meta.total` is how many in all. */
export function getSellerListings({ status, page = 1 }: SellerListingFilter = {}) {
  return api.get<Paginated<SellerListing>>("/seller/listings", { query: { status, page: page > 1 ? page : undefined } });
}

export function getSellerListing(id: number) {
  return api.get<Wrapped<SellerListing>>(path(id)).then(unwrap);
}

/**
 * Creates a listing as a draft, with its first photos if there are any. Sent as a form, because pictures cannot go as
 * JSON. `price` and `delivery_fee` are NAIRA text. Field errors: every field of the listing, and `images` or `images.0`
 * (wrong type, too small, too big).
 */
export function createListing({ images, ...fields }: NewListingInput) {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(key, String(value));
  }

  for (const file of images ?? []) form.append("images[]", file);

  return api.post<Wrapped<SellerListing>>("/seller/listings", form).then(unwrap);
}

/** Changes some details. Send only what changed (price and delivery fee in NAIRA text). A stock of 0 makes a live listing sold out. */
export function updateListing(id: number, changes: ListingChanges) {
  return api.patch<Wrapped<SellerListing>>(path(id), changes).then(unwrap);
}

/** Puts a draft on sale. Needs at least one photo and a stock above zero. Not possible for a listing an admin removed. */
export function publishListing(id: number) {
  return api.post<Wrapped<SellerListing>>(`${path(id)}/publish`).then(unwrap);
}

/** Takes it off sale and back to a draft. Nothing is lost, and it can be published again. */
export function unpublishListing(id: number) {
  return api.post<Wrapped<SellerListing>>(`${path(id)}/unpublish`).then(unwrap);
}

/** Adds photos to a listing, up to 8 in all (the error says how many more fit). Sent as a form. */
export function addListingPhotos(id: number, files: File[]) {
  const form = new FormData();

  for (const file of files) form.append("images[]", file);

  return api.post<Wrapped<SellerListing>>(`${path(id)}/images`, form).then(unwrap);
}

/** Removes one photo. A live listing must keep at least one, so it has to be unpublished first to remove the last. */
export function deleteListingPhoto(id: number, imageId: number) {
  return api.delete<Wrapped<SellerListing>>(`${path(id)}/images/${imageId}`).then(unwrap);
}

/** Deletes the listing. Past orders keep their history. A 204, with nothing in the answer. */
export function deleteListing(id: number) {
  return api.delete<void>(path(id));
}