"use client";

import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import type { AdminDispute, ChatLine, DisputeResolution } from "@/lib/types/admin-disputes";
import { useSession } from "@/components/providers/session-provider";
import {
  approveKyc,
  getDispute,
  getDisputes,
  getKycSubmission,
  getKycSubmissions,
  getOrderChat,
  getOverview,
  rejectKyc,
  resolveDispute,
  getPayments,
  getRefunds,
  refundPayment,
  retryRefund,
  getAdminPayouts,
  type DisputeFilter,
  type KycFilter,
  type OverviewPeriod,
  type PaymentFilter,
  type RefundFilter,
  type AdminPayoutFilter
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

// ---------------------------------------------------------------- disputes

const DISPUTES_KEY = [...ADMIN_KEY, "disputes"] as const;
const disputeListKey = (filter: DisputeFilter) => [...DISPUTES_KEY, "list", filter] as const;
const disputeDetailKey = (id: number) => [...DISPUTES_KEY, "detail", id] as const;

/** One page of disputes. Asked again every minute, so a new dispute appears without a reload. */
export function useDisputes(filter: DisputeFilter = {}) {
  return useQuery({
    queryKey: disputeListKey(filter),
    queryFn: () => getDisputes(filter),
    enabled: useIsAdmin(),
    placeholderData: keepPreviousData,
    refetchInterval: ADMIN_POLL_MS,
  });
}

/** One dispute. Kept fresh for only 10 seconds: another admin may have decided it since it was loaded. */
export function useDispute(id: number) {
  return useQuery({
    queryKey: disputeDetailKey(id),
    queryFn: () => getDispute(id),
    enabled: useIsAdmin(),
    staleTime: 10_000,
  });
}

/**
 * The order's chat for a dispute. A 403 (no dispute) or a 404 (the two never messaged) means "nothing to read", which is
 * not a failure: it gives an empty chat. Reading is recorded in the audit log, so the page asks for it on its own, once,
 * and does not ask again on its own.
 */
export function useOrderChat(orderNumber: string | undefined) {
  const query = useQuery({
    queryKey: [...DISPUTES_KEY, "chat", orderNumber],
    queryFn: async () => {
      try {
        return await getOrderChat(orderNumber as string);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return null;

        throw error;
      }
    },
    enabled: useIsAdmin() && Boolean(orderNumber),
    staleTime: Infinity, // every read is on record, so it is never re-read unless the admin asks
    retry: false,
  });

  // Earlier messages are loaded by hand and kept apart, so they are never thrown away.
  const [older, setOlder] = useState<ChatLine[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderFailed, setOlderFailed] = useState(false);

  const latest = query.data?.messages;
  const messages = useMemo(() => (latest ? [...older, ...latest] : older), [older, latest]);
  const hasMore = olderHasMore ?? query.data?.has_more ?? false;

  const loadOlder = useCallback(async () => {
    const oldestId = messages[0]?.id;

    if (!orderNumber || oldestId === undefined || loadingOlder) return;

    setLoadingOlder(true);
    setOlderFailed(false);

    try {
      const page = await getOrderChat(orderNumber, oldestId);

      setOlder((current) => [...page.messages, ...current]);
      setOlderHasMore(page.has_more);
    } catch {
      setOlderFailed(true);
    } finally {
      setLoadingOlder(false);
    }
  }, [orderNumber, messages, loadingOlder]);

  return {
    chat: query.data ?? null,
    messages,
    hasMore,
    loadOlder,
    loadingOlder,
    olderFailed,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Decides a dispute. The API answers with the dispute as it now is, which goes straight into the cache; the lists, and the
 * overview's open-disputes and payments-to-refund counts, are marked stale. The decision is final and moves money, so it is
 * never repeated automatically. If it fails because another admin already decided, the dispute is fetched again.
 */
export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolution, note }: { id: number; resolution: DisputeResolution; note?: string }) =>
      resolveDispute(id, resolution, note),

    onSuccess: (dispute: AdminDispute) => {
      queryClient.setQueryData(disputeDetailKey(dispute.id), dispute);
      void queryClient.invalidateQueries({ queryKey: [...DISPUTES_KEY, "list"] });
      void queryClient.invalidateQueries({ queryKey: [...ADMIN_KEY, "overview"] });
    },

    onError: (_error, variables) => {
      void queryClient.invalidateQueries({ queryKey: disputeDetailKey(variables.id) });
    },
  });
}

// ---------------------------------------------------------------- payments and refunds

const PAYMENTS_KEY = [...ADMIN_KEY, "payments"] as const;
const REFUNDS_KEY = [...ADMIN_KEY, "refunds"] as const;

/** One page of payments. Asked again every minute, so a payment that needs a refund appears without a reload. */
export function usePayments(filter: PaymentFilter = {}) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, "list", filter],
    queryFn: () => getPayments(filter),
    enabled: useIsAdmin(),
    placeholderData: keepPreviousData,
    refetchInterval: ADMIN_POLL_MS,
  });
}

/** One page of refunds. Asked again every minute, so a refund that finishes or fails shows up on its own. */
export function useRefunds(filter: RefundFilter = {}) {
  return useQuery({
    queryKey: [...REFUNDS_KEY, "list", filter],
    queryFn: () => getRefunds(filter),
    enabled: useIsAdmin(),
    placeholderData: keepPreviousData,
    refetchInterval: ADMIN_POLL_MS,
  });
}

/**
 * Money going back to a buyer. Both lists, and the overview's counts (payments to refund, refunds needing attention), are
 * refreshed afterwards, because refunding a payment moves it from one list to the other.
 *
 * Both actions move real money, so they are never repeated automatically. If one fails because someone already did it
 * (another admin, another tab), the lists are fetched again so the screen shows what is true.
 */
function useMoneyBack<TVariables>(act: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    void queryClient.invalidateQueries({ queryKey: REFUNDS_KEY });
    void queryClient.invalidateQueries({ queryKey: [...ADMIN_KEY, "overview"] });
  };

  return useMutation({ mutationFn: act, onSuccess: refresh, onError: refresh });
}

/** Sends a "needs_refund" payment back to the buyer, in full. */
export const useRefundPayment = () => useMoneyBack((id: number) => refundPayment(id));

/** Sends a failed refund again. Check the Paystack dashboard first so the buyer is not refunded twice. */
export const useRetryRefund = () => useMoneyBack((id: number) => retryRefund(id));

// ---------------------------------------------------------------- payouts (read-only)

/** One page of sellers' withdrawals. Asked again every minute, so a transfer that finishes or gets stuck shows on its own. */
export function useAdminPayouts(filter: AdminPayoutFilter = {}) {
  return useQuery({
    queryKey: [...ADMIN_KEY, "payouts", "list", filter],
    queryFn: () => getAdminPayouts(filter),
    enabled: useIsAdmin(),
    placeholderData: keepPreviousData,
    refetchInterval: ADMIN_POLL_MS,
  });
}