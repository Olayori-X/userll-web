"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useIsSeller } from "@/hooks/use-seller";
import { getSellerListings, type SellerListingFilter } from "@/lib/api/seller-listings";

/** Everything about the seller's own listings lives under ["seller", "listings", ...], so logging out wipes it all. */
const LISTINGS_KEY = ["seller", "listings"] as const;

/** One page of the seller's listings. While the next page or filter loads, the old results stay on screen. */
export function useSellerListings(filter: SellerListingFilter = {}) {
  return useQuery({
    queryKey: [...LISTINGS_KEY, "list", filter],
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