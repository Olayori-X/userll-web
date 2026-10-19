"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useConversations } from "@/hooks/use-chat";
import { formatMessageTime } from "@/lib/dates";
import { toQueryString } from "@/lib/query-string";
import type { Conversation } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";

/** What the conversation is about: the order, or the listing someone asked about. */
function subjectOf(conversation: Conversation): string {
  if (conversation.kind === "order" && conversation.order_number) return `Order ${conversation.order_number}`;

  return conversation.listing?.title ?? "Conversation";
}

const messagesHref = (page: number) => `/messages${toQueryString({ page: page > 1 ? page : undefined })}`;

function Row({ conversation }: { conversation: Conversation }) {
  const unread = conversation.unread_count;
  const last = conversation.last_message;
  const when = formatMessageTime(conversation.last_message_at);

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-4 outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40",
        unread > 0 ? "border-primary/40 bg-accent/30" : "border-border",
      )}
    >
      <Avatar name={conversation.other_party.name} />

      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("truncate", unread > 0 ? "font-bold" : "font-semibold")}>{conversation.other_party.name}</p>
          {when && (
            <time dateTime={conversation.last_message_at ?? undefined} className="shrink-0 text-xs text-muted-foreground">
              {when}
            </time>
          )}
        </div>

        <p className="truncate text-xs text-muted-foreground">{subjectOf(conversation)}</p>

        <div className="flex items-center justify-between gap-3">
          {/* React shows this as plain text, so nothing a person typed can run as code. */}
          <p className={cn("truncate text-sm", unread > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
            {last ? `${last.is_mine ? "You: " : ""}${last.preview}` : "No messages yet"}
          </p>

          {unread > 0 && (
            <span
              aria-label={`${unread} unread ${unread === 1 ? "message" : "messages"}`}
              className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] leading-5 font-bold text-primary-foreground"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** The inbox. Checked again every 20 seconds while the tab is in view, so new messages appear on their own. */
export function ConversationList({ page }: { page: number }) {
  const inbox = useConversations(page);

  if (inbox.isPending) return <PageSkeleton label="Loading your messages" />;

  if (inbox.isError) {
    return (
      <Alert variant="error" title="We couldn't load your messages">
        <Button variant="link" onClick={() => void inbox.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  const conversations = inbox.data.data;

  if (conversations.length === 0) {
    return (
      <PageNotice icon={<MessageCircle className="size-7" aria-hidden />} title={page > 1 ? "Nothing on this page" : "No messages yet"}>
        <p className="max-w-sm text-sm text-muted-foreground">
          {page > 1
            ? "There are no conversations on this page."
            : "Have a question about something? Open a listing and message the seller."}
        </p>
        <Link href={page > 1 ? "/messages" : "/listings"} className={buttonVariants({ size: "lg" })}>
          {page > 1 ? "Back to messages" : "Browse products"}
        </Link>
      </PageNotice>
    );
  }

  return (
    <div className="grid gap-4">
      <ul className={cn("grid gap-3 transition-opacity", inbox.isPlaceholderData && "opacity-60")}>
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <Row conversation={conversation} />
          </li>
        ))}
      </ul>

      <Pagination currentPage={inbox.data.meta.current_page} lastPage={inbox.data.meta.last_page} hrefFor={messagesHref} />
    </div>
  );
}