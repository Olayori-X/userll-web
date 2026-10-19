"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircleOff, SendHorizontal } from "lucide-react";
import { ApiError } from "@/lib/api";
import { MAX_MESSAGE_LENGTH } from "@/lib/api/chat";
import { useSendMessage, useThread } from "@/hooks/use-chat";
import { formatClock, formatDayLabel } from "@/lib/dates";
import type { Message } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Item = { type: "day"; key: string; label: string } | { type: "message"; message: Message };

/** The messages in order, with a heading ("Today", "Yesterday", "14 Mar 2026") wherever a new day starts. */
function withDayHeadings(messages: Message[]): Item[] {
  const items: Item[] = [];
  let lastLabel: string | null = null;

  for (const message of messages) {
    const label = formatDayLabel(message.sent_at);

    if (label && label !== lastLabel) {
      items.push({ type: "day", key: `day-${message.id}`, label });
      lastLabel = label;
    }

    items.push({ type: "message", message });
  }

  return items;
}

function Bubble({ message, showStatus }: { message: Message; showStatus: boolean }) {
  return (
    <li className={cn("flex flex-col gap-1", message.is_mine ? "items-end" : "items-start")}>
      {/* Shown as plain text, with line breaks kept. Nothing a person typed can run as code. */}
      <p
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap sm:max-w-[75%]",
          message.is_mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
        )}
      >
        {message.body}
      </p>

      <p className="px-1 text-[11px] text-muted-foreground">
        <time dateTime={message.sent_at}>{formatClock(message.sent_at)}</time>
        {showStatus && ` · ${message.is_read ? "Seen" : "Sent"}`}
      </p>
    </li>
  );
}

export function ChatThread({ conversationId }: { conversationId: number }) {
  const thread = useThread(conversationId);
  const send = useSendMessage(conversationId);

  const [text, setText] = useState("");

  const scroller = useRef<HTMLDivElement>(null);
  /** True while the reader is at (or near) the bottom: new messages then scroll into view. Otherwise they are left alone. */
  const stickToBottom = useRef(true);
  /** Where the reader was before earlier messages were added at the top, so the screen does not jump. */
  const anchor = useRef<{ height: number; top: number } | null>(null);

  const { messages, olderFailed } = thread;
  const lastId = messages.at(-1)?.id;

  function onScroll() {
    const element = scroller.current;

    if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  }

  // After the messages change: hold the reader's place if older ones were added above, otherwise follow the bottom.
  useLayoutEffect(() => {
    const element = scroller.current;

    if (!element) return;

    if (anchor.current) {
      element.scrollTop = element.scrollHeight - anchor.current.height + anchor.current.top;
      anchor.current = null;
    } else if (stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages.length, lastId]);

  useEffect(() => {
    if (olderFailed) anchor.current = null; // nothing was added, so there is no place to hold
  }, [olderFailed]);

  function loadEarlier() {
    const element = scroller.current;

    if (element) anchor.current = { height: element.scrollHeight, top: element.scrollTop };

    void thread.loadOlder();
  }

  function submit() {
    const body = text.trim();

    if (!body || send.isPending) return;

    send.mutate(body, {
      onSuccess: () => {
        setText("");
        stickToBottom.current = true; // show what was just sent
      },
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // With a mouse and keyboard, Enter sends and Shift+Enter makes a new line. On a phone, Enter is always a new line.
    const hasKeyboard = window.matchMedia("(pointer: fine)").matches;

    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && hasKeyboard) {
      event.preventDefault();
      submit();
    }
  }

  if (thread.isPending) return <PageSkeleton label="Loading the conversation" />;

  if (thread.isError || !thread.conversation) {
    const notFound = thread.error instanceof ApiError && thread.error.status === 404;

    return (
      <PageNotice
        icon={<MessageCircleOff className="size-7" aria-hidden />}
        title={notFound ? "We couldn't find that conversation" : "We couldn't load this conversation"}
      >
        <p className="text-sm text-muted-foreground">
          {notFound ? "It may belong to a different account." : "Check your connection and try again."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {!notFound && (
            <Button size="lg" onClick={() => void thread.refetch()}>
              Try again
            </Button>
          )}
          <Link href="/messages" className={buttonVariants({ variant: notFound ? "default" : "outline", size: "lg" })}>
            All messages
          </Link>
        </div>
      </PageNotice>
    );
  }

  const { conversation } = thread;
  const items = withDayHeadings(messages);
  const lastMineId = messages.findLast((message) => message.is_mine)?.id;

  // A buyer gets a link to the shop (a seller does not), and only a buyer has a page for the order.
  const isBuyer = conversation.other_party.store_slug !== null;

  const subject =
    conversation.kind === "order" && conversation.order_number ? (
      isBuyer ? (
        <Link href={`/orders/${conversation.order_number}`} className="hover:text-primary hover:underline">
          Order {conversation.order_number}
        </Link>
      ) : (
        <>Order {conversation.order_number}</>
      )
    ) : conversation.listing ? (
      <Link href={`/listings/${conversation.listing.slug}`} className="hover:text-primary hover:underline">
        {conversation.listing.title}
      </Link>
    ) : null;

  const sendError = send.error
    ? send.error instanceof ApiError
      ? (send.error.fieldError("body") ??
        send.error.fieldError("conversation") ??
        send.error.fieldError("account") ??
        send.error.message)
      : "Something went wrong. Please try again."
    : null;

  const nearLimit = text.length > MAX_MESSAGE_LENGTH - 300;

  return (
    <div className="flex h-[75dvh] min-h-96 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border p-3 sm:p-4">
        <Link href="/messages" aria-label="Back to messages" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
          <ArrowLeft aria-hidden />
        </Link>

        <Avatar name={conversation.other_party.name} size="sm" />

        <div className="grid min-w-0 gap-0.5">
          <p className="truncate font-semibold">
            {conversation.other_party.store_slug ? (
              <Link href={`/sellers/${conversation.other_party.store_slug}`} className="hover:text-primary hover:underline">
                {conversation.other_party.name}
              </Link>
            ) : (
              conversation.other_party.name
            )}
          </p>
          {subject && <p className="truncate text-xs text-muted-foreground">{subject}</p>}
        </div>
      </header>

      <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto p-4">
        {thread.hasMore && (
          <div className="mb-4 flex justify-center">
            <Button variant="outline" size="sm" loading={thread.loadingOlder} onClick={loadEarlier}>
              Load earlier messages
            </Button>
          </div>
        )}

        {thread.olderFailed && (
          <Alert variant="error" className="mb-4">
            We couldn&apos;t load earlier messages. Try again.
          </Alert>
        )}

        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
        ) : (
          <ul role="log" aria-label="Messages" className="grid gap-3">
            {items.map((item) =>
              item.type === "day" ? (
                <li key={item.key} className="my-1 flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">{item.label}</span>
                </li>
              ) : (
                <Bubble key={item.message.id} message={item.message} showStatus={item.message.id === lastMineId} />
              ),
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="grid gap-2 border-t border-border p-3 sm:p-4"
      >
        {sendError && <Alert variant="error">{sendError}</Alert>}

        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (send.isError) send.reset();
            }}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Write a message"
            aria-label="Write a message"
            className="max-h-40 min-h-10 resize-none"
          />

          <Button type="submit" size="icon-lg" aria-label="Send message" loading={send.isPending} disabled={!text.trim()}>
            <SendHorizontal aria-hidden />
          </Button>
        </div>

        {nearLimit && (
          <p className="text-right text-xs text-muted-foreground" aria-live="polite">
            {text.length} / {MAX_MESSAGE_LENGTH}
          </p>
        )}
      </form>
    </div>
  );
}