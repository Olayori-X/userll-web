"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers/session-provider";
import {
  approveKyc,
  getKycSubmission,
  getKycSubmissions,
  getOverview,
  rejectKyc,
  type KycFilter,
  type OverviewPeriod,
} from "@/lib/api/admin";
import type { AdminKycSubmission } from "@/lib/types/admin-kyc";

/** Everything about the admin console lives under ["admin", ...] in the cache, so logging out wipes it all. */
const ADMIN_KEY = ["admin"] as const;

/** How often the screens ask again while in view. A new dispute or identity check should not wait for a reload. */
export const ADMIN_POLL_MS = 60_000;

/** Only asked for an administrator with a verified email. The API refuses everyone else on its own. */
export function useIsAdmin() {
  const { user } = useSession();

  return Boolean(user?.email_verified && user.role === "admin");
}

/** The platform's numbers for a period. Asked again every minute, so what needs attention stays current. */
export function useOverview(period: OverviewPeriod = {}) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "overview", period],
    queryFn: () => getOverview(period),
    enabled: useIsAdmin(),
    staleTime: 30_000,
    refetchInterval: ADMIN_POLL_MS,
  });
}

// ---------------------------------------------------------------- identity checks

const KYC_KEY = [...ADMIN_KEY, "kyc"] as const;
const kycListKey = (filter: KycFilter) => [...KYC_KEY, "list", filter] as const;
const kycDetailKey = (id: number) => [...KYC_KEY, "detail", id] as const;

/** One page of identity checks. Asked again every minute, so a new submission appears without a reload. */
export function useKycSubmissions(filter: KycFilter = {}) {
  return useQuery({
    queryKey: kycListKey(filter),
    queryFn: () => getKycSubmissions(filter),
    enabled: useIsAdmin(),
    placeholderData: keepPreviousData,
    refetchInterval: ADMIN_POLL_MS,
  });
}

/**
 * One submission, with the name-match hint. Kept fresh for only 10 seconds: another admin may have decided it since it
 * was loaded.
 */
export function useKycSubmission(id: number) {
  return useQuery({
    queryKey: kycDetailKey(id),
    queryFn: () => getKycSubmission(id),
    enabled: useIsAdmin(),
    staleTime: 10_000,
  });
}

/**
 * A decision on an identity check. The API answers with the submission as it now is, which goes straight into the
 * cache; the lists and the overview's "pending" count are marked stale so they catch up. The decision is final, and
 * never repeated automatically.
 *
 * If it fails because someone else already decided, the submission is fetched again so the screen shows what is true.
 */
function useKycDecision<TVariables extends { id: number }>(decide: (variables: TVariables) => Promise<AdminKycSubmission>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: decide,
    onSuccess: (submission) => {
      // The single view has a name-match the decision's answer lacks, so keep it when the submission goes into the cache.
      queryClient.setQueryData<AdminKycSubmission>(kycDetailKey(submission.id), (current) => ({
        ...submission,
        name_match: submission.name_match ?? current?.name_match,
      }));
      void queryClient.invalidateQueries({ queryKey: [...KYC_KEY, "list"] });
      void queryClient.invalidateQueries({ queryKey: [...ADMIN_KEY, "overview"] });
    },
    onError: (_error, variables) => {
      void queryClient.invalidateQueries({ queryKey: kycDetailKey(variables.id) });
    },
  });
}

export const useApproveKyc = () => useKycDecision(({ id }: { id: number }) => approveKyc(id));

export const useRejectKyc = () => useKycDecision(({ id, reason }: { id: number; reason: string }) => rejectKyc(id, reason));