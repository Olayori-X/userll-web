"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsSeller } from "@/hooks/use-seller";
import {
  addListingPhotos,
  createListing,
  deleteListing,
  deleteListingPhoto,
  getSellerListing,
  getSellerListings,
  publishListing,
  unpublishListing,
  updateListing,
  type SellerListingFilter,
} from "@/lib/api/seller-listings";
import type { ListingChanges, NewListingInput, SellerListing } from "@/lib/types/seller-listings";

/** Everything about the seller's own listings lives under ["seller", "listings", ...], so logging out wipes it all. */
const LISTINGS_KEY = ["seller", "listings"] as const;
const LIST_KEY = [...LISTINGS_KEY, "list"] as const;
const detailKey = (id: number) => [...LISTINGS_KEY, "detail", id] as const;

/** One page of the seller's listings. While the next page or filter loads, the old results stay on screen. */
export function useSellerListings(filter: SellerListingFilter = {}) {
  return useQuery({
    queryKey: [...LIST_KEY, filter],
    queryFn: () => getSellerListings(filter),
    enabled: useIsSeller(),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * How many listings the seller has, for the dashboard. It asks for one page and reads `meta.total`, so it
 * never downloads more than it needs. With no filter it counts every listing, drafts included.
 */
export function useSellerListingCount(status?: SellerListingFilter["status"]): { count: number | undefined; isPending: boolean } {
  const query = useSellerListings({ status });

  return { count: query.data?.meta.total, isPending: query.isPending };
}

/** One listing, for its edit page. */
export function useSellerListing(id: number) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => getSellerListing(id),
    enabled: useIsSeller(),
    staleTime: 10_000,
  });
}

/**
 * A change to one listing. The API answers with the whole updated listing, which goes straight into the cache, and
 * every list is marked stale so counts, tabs and rows catch up. Anything that changes the listing's status (publish,
 * a stock of 0, an admin's removal) moves it between the "Active", "Drafts" and "Sold out" tabs.
 *
 * Changes are never repeated automatically (the app's default for all writes).
 *
 * Note for later: the PUBLIC pages (the listing page, search, the shop) are kept for up to a minute by the server, so
 * a change can take that long to show to buyers. Checkout always uses the real price and stock.
 */
function useListingChange<TVariables extends { id: number }>(change: (variables: TVariables) => Promise<SellerListing>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: change,
    onSuccess: (listing) => {
      queryClient.setQueryData(detailKey(listing.id), listing);
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

/** Creates a draft, with its first photos if any. The new listing goes into the cache, so its edit page opens instantly. */
export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewListingInput) => createListing(input),
    onSuccess: (listing) => {
      queryClient.setQueryData(detailKey(listing.id), listing);
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export const useUpdateListing = () =>
  useListingChange(({ id, changes }: { id: number; changes: ListingChanges }) => updateListing(id, changes));

export const usePublishListing = () => useListingChange(({ id }: { id: number }) => publishListing(id));

export const useUnpublishListing = () => useListingChange(({ id }: { id: number }) => unpublishListing(id));

export const useAddListingPhotos = () => useListingChange(({ id, files }: { id: number; files: File[] }) => addListingPhotos(id, files));

export const useDeleteListingPhoto = () =>
  useListingChange(({ id, imageId }: { id: number; imageId: number }) => deleteListingPhoto(id, imageId));

/** Deletes a listing. Its page is dropped from the cache, and the lists are refreshed. */
export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteListing(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: detailKey(id) });
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}