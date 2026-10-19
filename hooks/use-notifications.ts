"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers/session-provider";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationFilter,
} from "@/lib/api/notifications";
import type { NotificationPage } from "@/lib/types/notifications";

/** Everything about notifications lives under ["notifications", ...] in the cache, so logging out wipes it all. */
const NOTIFICATIONS_KEY = ["notifications"] as const;
const COUNT_KEY = [...NOTIFICATIONS_KEY, "count"] as const;
const listKey = (filter: NotificationFilter) => [...NOTIFICATIONS_KEY, "list", filter] as const;

/** How often each screen asks again. The API has no live push, so this is what keeps them current. */
const POLL_MS = 30_000;

/** Like the cart, orders and chat: only asked for someone who can have notifications (logged in, email verified). */
function useCanHaveNotifications() {
  const { user } = useSession();

  return Boolean(user?.email_verified);
}

/** The number for the bell in the header. Asked again every 30 seconds while the tab is in view. */
export function useUnreadNotificationCount(): number {
  const query = useQuery({
    queryKey: COUNT_KEY,
    queryFn: getUnreadNotificationCount,
    enabled: useCanHaveNotifications(),
    refetchInterval: POLL_MS,
  });

  return query.data ?? 0;
}

/** One page of the inbox, checked again every 30 seconds. The old page stays visible while a new one loads. */
export function useNotifications(filter: NotificationFilter = {}) {
  return useQuery({
    queryKey: listKey(filter),
    queryFn: () => getNotifications(filter),
    enabled: useCanHaveNotifications(),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
}

/**
 * Marks one notification read. The change is made on screen at once (the dot goes, the count drops) and
 * confirmed by the API afterwards. If the API refuses, everything is put back exactly as it was.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });

      const lists = queryClient.getQueriesData<NotificationPage>({ queryKey: [...NOTIFICATIONS_KEY, "list"] });
      const count = queryClient.getQueryData<number>(COUNT_KEY);

      let wasUnread = false;

      for (const [key, page] of lists) {
        if (!page) continue;

        queryClient.setQueryData<NotificationPage>(key, {
          ...page,
          data: page.data.map((item) => {
            if (item.id !== id) return item;

            wasUnread ||= !item.is_read;

            return { ...item, is_read: true };
          }),
        });
      }

      // Lowers the numbers only if it really was unread, so marking one twice never counts twice.
      if (wasUnread) {
        queryClient.setQueryData<number>(COUNT_KEY, Math.max(0, (count ?? 0) - 1));

        for (const [key] of lists) {
          queryClient.setQueryData<NotificationPage>(key, (page) =>
            page ? { ...page, unread_count: Math.max(0, page.unread_count - 1) } : page,
          );
        }
      }

      return { lists, count };
    },

    onError: (_error, _id, previous) => {
      if (!previous) return;

      for (const [key, page] of previous.lists) queryClient.setQueryData(key, page);
      queryClient.setQueryData(COUNT_KEY, previous.count);
    },

    // Whatever happened, ask the API for the truth afterwards.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

/** "Mark all as read": everything on screen turns read and the count goes to 0 straight away. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,

    onSuccess: () => {
      queryClient.setQueryData(COUNT_KEY, 0);

      queryClient.setQueriesData<NotificationPage>({ queryKey: [...NOTIFICATIONS_KEY, "list"] }, (page) =>
        page ? { ...page, unread_count: 0, data: page.data.map((item) => ({ ...item, is_read: true })) } : page,
      );

      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}