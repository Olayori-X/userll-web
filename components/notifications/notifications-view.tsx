"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Banknote,
  Bell,
  CheckCheck,
  CircleAlert,
  Lock,
  MessageCircle,
  Package,
  ShieldCheck,
  Star,
  Tag,
  TriangleAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-notifications";
import { formatMessageTime } from "@/lib/dates";
import { toQueryString } from "@/lib/query-string";
import { safeRedirectPath } from "@/lib/safe-redirect";
import type { AppNotification } from "@/lib/types/notifications";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

type Tone = "info" | "success" | "warning" | "danger" | "neutral";
type Look = { icon: LucideIcon; tone: Tone };

const TONES: Record<Tone, string> = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

/** The look of each kind of notification. Specific kinds first, then a default for the whole area. */
const BY_KIND: Record<string, Look> = {
  "order.completed": { icon: Package, tone: "success" },
  "order.cancelled": { icon: Package, tone: "neutral" },
  "refund.processed": { icon: Undo2, tone: "success" },
  "dispute.resolved": { icon: TriangleAlert, tone: "success" },
  "payout.paid": { icon: Banknote, tone: "success" },
  "payout.failed": { icon: CircleAlert, tone: "danger" },
  "kyc.approved": { icon: ShieldCheck, tone: "success" },
  "kyc.rejected": { icon: ShieldCheck, tone: "danger" },
  "account.suspended": { icon: Lock, tone: "danger" },
  "account.reactivated": { icon: Lock, tone: "success" },
  "listing.removed": { icon: Tag, tone: "danger" },
  "listing.restored": { icon: Tag, tone: "success" },
};

const BY_AREA: Record<string, Look> = {
  order: { icon: Package, tone: "info" },
  refund: { icon: Undo2, tone: "info" },
  dispute: { icon: TriangleAlert, tone: "warning" },
  payout: { icon: Banknote, tone: "info" },
  kyc: { icon: ShieldCheck, tone: "info" },
  review: { icon: Star, tone: "info" },
  chat: { icon: MessageCircle, tone: "info" },
  account: { icon: Lock, tone: "info" },
  listing: { icon: Tag, tone: "info" },
  admin: { icon: ShieldCheck, tone: "warning" },
};

/** A kind this screen has never heard of still gets a bell, so a new notification is never blank. */
function lookFor(kind: string | null): Look {
  if (!kind) return { icon: Bell, tone: "info" };

  return BY_KIND[kind] ?? BY_AREA[kind.split(".")[0]] ?? { icon: Bell, tone: "info" };
}

const inboxHref = (unreadOnly: boolean, page = 1) =>
  `/notifications${toQueryString({ unread: unreadOnly || undefined, page: page > 1 ? page : undefined })}`;

function Row({ item, onRead }: { item: AppNotification; onRead: () => void }) {
  const { icon: Icon, tone } = lookFor(item.kind);
  const when = formatMessageTime(item.created_at);

  // The link came from the server, but it is still only text: it is followed only when it is a path on this site.
  const target = item.link ? safeRedirectPath(item.link, "") : "";

  const content: ReactNode = (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", TONES[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>

      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn("text-sm", item.is_read ? "font-medium" : "font-bold")}>{item.title ?? "Notification"}</span>
          {when && (
            <time dateTime={item.created_at} className="shrink-0 text-xs text-muted-foreground">
              {when}
            </time>
          )}
        </span>

        {/* Plain text: nothing in it can run as code. */}
        {item.body && <span className="text-sm leading-snug break-words text-muted-foreground">{item.body}</span>}
      </span>

      {!item.is_read && (
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden>
          <span className="sr-only">Unread</span>
        </span>
      )}
    </>
  );

  const classes = cn(
    "flex w-full gap-3 rounded-xl border p-4 text-left outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/40",
    item.is_read ? "border-border bg-card" : "border-primary/30 bg-accent/30",
    (target || !item.is_read) && "hover:shadow-md",
  );

  // Opening it counts as having seen it: it is marked read, and the page it leads to opens.
  if (target) {
    return (
      <Link href={target} onClick={() => !item.is_read && onRead()} className={classes}>
        {content}
      </Link>
    );
  }

  // Nowhere to go (or somewhere that is not ours): tapping it just marks it read.
  if (!item.is_read) {
    return (
      <button type="button" onClick={onRead} className={classes}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}

type NotificationsViewProps = {
  unreadOnly: boolean;
  page: number;
};

export function NotificationsView({ unreadOnly, page }: NotificationsViewProps) {
  const inbox = useNotifications({ unreadOnly, page });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = inbox.data?.unread_count ?? 0;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter notifications">
          <ul className="flex gap-2">
            {[
              { label: "All", only: false },
              { label: unread > 0 ? `Unread (${unread})` : "Unread", only: true },
            ].map((tab) => (
              <li key={tab.label}>
                <Link
                  href={inboxHref(tab.only)}
                  aria-current={tab.only === unreadOnly ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    tab.only === unreadOnly
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-input bg-card hover:border-primary/50",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {unread > 0 && (
          <Button variant="ghost" size="sm" loading={markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck aria-hidden />
            Mark all as read
          </Button>
        )}
      </div>

      {markAll.isError && <Alert variant="error">We couldn&apos;t mark them as read. Please try again.</Alert>}

      {inbox.isPending && <PageSkeleton label="Loading your notifications" />}

      {inbox.isError && (
        <Alert variant="error" title="We couldn't load your notifications">
          <Button variant="link" onClick={() => void inbox.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {inbox.data && inbox.data.data.length === 0 && (
        <PageNotice
          icon={<Bell className="size-7" aria-hidden />}
          title={unreadOnly ? "You're all caught up" : page > 1 ? "Nothing on this page" : "No notifications yet"}
        >
          <p className="max-w-sm text-sm text-muted-foreground">
            {unreadOnly
              ? "Nothing new to read."
              : page > 1
                ? "There are no notifications on this page."
                : "Updates about your orders, payments and messages will show up here."}
          </p>
          {(unreadOnly || page > 1) && (
            <Link href="/notifications" className={buttonVariants({ size: "lg" })}>
              Show all
            </Link>
          )}
        </PageNotice>
      )}

      {inbox.data && inbox.data.data.length > 0 && (
        <>
          <ul className={cn("grid gap-3 transition-opacity", inbox.isPlaceholderData && "opacity-60")}>
            {inbox.data.data.map((item) => (
              <li key={item.id}>
                <Row item={item} onRead={() => markRead.mutate(item.id)} />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={inbox.data.meta.current_page}
            lastPage={inbox.data.meta.last_page}
            hrefFor={(target) => inboxHref(unreadOnly, target)}
          />
        </>
      )}
    </div>
  );
}