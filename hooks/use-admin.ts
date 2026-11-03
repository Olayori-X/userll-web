"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/providers/session-provider";
import { getOverview, type OverviewPeriod } from "@/lib/api/admin";

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