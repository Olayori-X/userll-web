"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers/session-provider";
import {
  createSellerProfile,
  getBanks,
  getKyc,
  getPayoutAccount,
  getSellerProfile,
  savePayoutAccount,
  submitKyc,
  updateSellerProfile,
} from "@/lib/api/seller";
import type { KycInput, NewSellerProfile, SellerProfileChanges } from "@/lib/types/seller";

/**
 * Everything about the seller's own side lives under ["seller", ...] in the cache, so logging out wipes it all.
 * The bank list is kept apart: it is the same for everyone and is not private.
 */
const SELLER_KEY = ["seller"] as const;
const PROFILE_KEY = [...SELLER_KEY, "profile"] as const;
const KYC_KEY = [...SELLER_KEY, "kyc"] as const;
const PAYOUT_ACCOUNT_KEY = [...SELLER_KEY, "payout-account"] as const;
const BANKS_KEY = ["banks"] as const;

/** Only asked for someone who really is a seller (a shop exists, email verified). The API refuses everyone else. */
export function useIsSeller() {
  const { user } = useSession();

  return Boolean(user?.email_verified && user.is_seller);
}

/** The seller's own shop details. */
export function useSellerProfile() {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: getSellerProfile, enabled: useIsSeller(), staleTime: 60_000 });
}

/** Where the seller stands with their identity check. Kept fresh for 30 seconds: an admin may have just decided. */
export function useKyc() {
  return useQuery({ queryKey: KYC_KEY, queryFn: getKyc, enabled: useIsSeller(), staleTime: 30_000 });
}

/** The current payout account, or null when none is set up (so `data === null` means "none", not "loading"). */
export function usePayoutAccount() {
  return useQuery({ queryKey: PAYOUT_ACCOUNT_KEY, queryFn: getPayoutAccount, enabled: useIsSeller(), staleTime: 60_000 });
}

/**
 * The banks to choose from. The list hardly ever changes, so it is kept for a day. Pass `enabled: false` until
 * the form that needs it is on screen, so nobody waits for a list they will not use.
 */
export function useBanks(enabled = true) {
  return useQuery({
    queryKey: BANKS_KEY,
    queryFn: getBanks,
    enabled: useIsSeller() && enabled,
    staleTime: 24 * 60 * 60_000,
    retry: 1, // a 502 here means the bank list is down for a moment: one more try, then the form says so
  });
}

/**
 * Opens a shop. Afterwards the account's `is_seller` is true, but the session still holds the old answer, so the
 * session is reloaded before this finishes. Whoever called it then finds the seller menu and pages already working.
 */
export function useCreateSellerProfile() {
  const queryClient = useQueryClient();
  const { refresh } = useSession();

  return useMutation({
    mutationFn: (input: NewSellerProfile) => createSellerProfile(input),
    onSuccess: async (profile) => {
      queryClient.setQueryData(PROFILE_KEY, profile);
      await refresh();
    },
  });
}

/** Changes shop details. The saved profile goes straight into the cache. */
export function useUpdateSellerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: SellerProfileChanges) => updateSellerProfile(changes),
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_KEY, profile),
  });
}

/** Sends an identity check. The status becomes "pending", so the answer is fetched again. */
export function useSubmitKyc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: KycInput) => submitKyc(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KYC_KEY }),
  });
}

/**
 * Sets or replaces the payout account. The saved account goes straight into the cache, and the rest of the
 * seller's data is refreshed, because a new account pauses withdrawals for a day and the wallet shows that.
 */
export function useSavePayoutAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bankCode, accountNumber }: { bankCode: string; accountNumber: string }) =>
      savePayoutAccount(bankCode, accountNumber),
    onSuccess: (account) => {
      queryClient.setQueryData(PAYOUT_ACCOUNT_KEY, { data: account }.data);
      void queryClient.invalidateQueries({ queryKey: SELLER_KEY, refetchType: "inactive" });
    },
  });
}