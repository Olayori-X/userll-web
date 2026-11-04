"use client";

import { useState } from "react";
import { Eye, MessageCircleOff } from "lucide-react";
import { useOrderChat } from "@/hooks/use-admin";
import { formatClock, formatDayLabel } from "@/lib/dates";
import type { ChatLine } from "@/lib/types/admin-disputes";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Item = { type: "day"; key: string; label: string } | { type: "line"; line: ChatLine };

/** The messages in order, with a heading ("Today", "14 Mar 2026") wherever a new day starts. */
function withDayHeadings(lines: ChatLine[]): Item[] {
  const items: Item[] = [];
  let lastLabel: string | null = null;

  for (const line of lines) {
    const label = formatDayLabel(line.sent_at);

    if (label && label !== lastLabel) {
      items.push({ type: "day", key: `day-${line.id}`, label });
      lastLabel = label;
    }

    items.push({ type: "line", line });
  }

  return items;
}

/** What is shown once the chat has been opened. Separate, so the chat is asked for only when the admin chooses to read it. */
function Opened({ orderNumber }: { orderNumber: string }) {
  const chat = useOrderChat(orderNumber);

  if (chat.isPending) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted" role="status" aria-label="Loading the conversation" />;
  }

  if (chat.isError) {
    return (
      <Alert variant="error" title="We couldn't load the conversation">
        <Button variant="link" onClick={() => void chat.refetch()}>
          Try again
        </Button>
      </Alert>
    );
  }

  if (!chat.chat) {
    return (
      <div className="grid justify-items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-6 py-8 text-center">
        <MessageCircleOff className="size-7 text-muted-foreground" aria-hidden />
        <p className="text-sm font-semibold">No messages</p>
        <p className="max-w-sm text-xs text-muted-foreground">The buyer and the seller never wrote to each other about this order.</p>
      </div>
    );
  }

  const { buyer, seller } = chat.chat;
  const items = withDayHeadings(chat.messages);

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        Between <span className="font-semibold text-foreground">{buyer.name ?? "the buyer"}</span> (buyer) and{" "}
        <span className="font-semibold text-foreground">{seller.store_name ?? seller.name ?? "the seller"}</span> (seller). Read-only.
      </p>

      {chat.hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" loading={chat.loadingOlder} onClick={() => void chat.loadOlder()}>
            Load earlier messages
          </Button>
        </div>
      )}

      {chat.olderFailed && <Alert variant="error">We couldn&apos;t load earlier messages. Try again.</Alert>}

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">There are no messages in this chat.</p>
      ) : (
        <ul role="log" aria-label="Messages between the buyer and the seller" className="grid max-h-[28rem] gap-3 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
          {items.map((item) =>
            item.type === "day" ? (
              <li key={item.key} className="my-1 flex justify-center">
                <span className="rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">{item.label}</span>
              </li>
            ) : (
              <li key={item.line.id} className={cn("flex flex-col gap-1", item.line.from === "seller" ? "items-end" : "items-start")}>
                <p className="px-1 text-[11px] font-semibold text-muted-foreground">{item.line.from === "buyer" ? "Buyer" : "Seller"}</p>

                {/* Shown as plain text, with line breaks kept. Nothing a person typed can run as code. */}
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap sm:max-w-[75%]",
                    item.line.from === "seller" ? "rounded-br-md bg-accent text-accent-foreground" : "rounded-bl-md bg-card",
                  )}
                >
                  {item.line.body}
                </p>

                <p className="px-1 text-[11px] text-muted-foreground">
                  <time dateTime={item.line.sent_at}>{formatClock(item.line.sent_at)}</time>
                </p>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * The buyer's and seller's chat about the order in dispute: evidence for the decision.
 *
 * It is not loaded until the admin chooses to read it. Every read of a private conversation is recorded in the audit log, so
 * it only happens on purpose, never just because a page opened.
 */
export function DisputeChat({ orderNumber }: { orderNumber: string }) {
  const [opened, setOpened] = useState(false);

  return (
    <section aria-labelledby="chat-heading" className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-0.5">
        <h2 id="chat-heading" className="text-lg font-bold">
          Their conversation
        </h2>
        <p className="text-sm text-muted-foreground">What the buyer and the seller wrote to each other about this order.</p>
      </div>

      {opened ? (
        <Opened orderNumber={orderNumber} />
      ) : (
        <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            This is a private conversation. Reading it is recorded in the audit log, with your name and the time.
          </p>
          <Button variant="outline" className="justify-self-start" onClick={() => setOpened(true)}>
            <Eye aria-hidden />
            Read the conversation
          </Button>
        </div>
      )}
    </section>
  );
}