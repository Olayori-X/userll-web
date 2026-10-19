/**
 * The notifications inbox. Needs a login and a verified email.
 *
 * There are no live pushes: the screens ask again every so often (see hooks/use-notifications.ts).
 */

import { api } from "@/lib/api";
import type { Wrapped } from "@/lib/types/common";
import type { AppNotification, NotificationPage } from "@/lib/types/notifications";

const unwrap = <T>({ data }: Wrapped<T>) => data;

export type NotificationFilter = {
  /** Only the ones not read yet. */
  unreadOnly?: boolean;
  page?: number;
};

/** The inbox, newest first, 20 to a page. The answer also says how many are unread in all (`unread_count`). */
export function getNotifications({ unreadOnly = false, page = 1 }: NotificationFilter = {}) {
  return api.get<NotificationPage>("/notifications", {
    query: { unread: unreadOnly, page: page > 1 ? page : undefined },
  });
}

/** Just the number, for the bell in the header. A single cheap call. */
export function getUnreadNotificationCount() {
  return api
    .get<Wrapped<{ unread_count: number }>>("/notifications/unread-count")
    .then((result) => unwrap(result).unread_count);
}

/** Marks one notification as read, and answers with it as it now is. Only the person's own can be marked. */
export function markNotificationRead(id: string) {
  return api.post<Wrapped<AppNotification>>(`/notifications/${encodeURIComponent(id)}/read`).then(unwrap);
}

/** Marks everything as read. Answers with the new unread count, which is always 0. */
export function markAllNotificationsRead() {
  return api.post<Wrapped<{ unread_count: number }>>("/notifications/read-all").then((result) => unwrap(result).unread_count);
}