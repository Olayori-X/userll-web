"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useStartListingChat, useStartOrderChat } from "@/hooks/use-chat";
import type { Conversation } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";

type MessageButtonProps = {
  /** What to talk about: a listing (by its slug), or an order that has been paid (by its number). */
  about: { listing: string } | { order: string };
  /** The words on the button. */
  children?: ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
};

/**
 * Opens a conversation and goes to it. If one about this listing or order already exists, that one opens,
 * so pressing it twice is harmless. Logged-out visitors are sent to log in and brought straight back.
 */
export function MessageButton({ about, children = "Message seller", variant = "outline", className }: MessageButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSession();

  const listingChat = useStartListingChat();
  const orderChat = useStartOrderChat();
  const chat = "listing" in about ? listingChat : orderChat;

  function open() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);

      return;
    }

    if (!user.email_verified) {
      router.push(`/verify-email?next=${encodeURIComponent(pathname)}`);

      return;
    }

    const options = { onSuccess: (conversation: Conversation) => router.push(`/messages/${conversation.id}`) };

    if ("listing" in about) listingChat.mutate(about.listing, options);
    else orderChat.mutate(about.order, options);
  }

  // The API names what is wrong: "You cannot message yourself about your own listing." and the like.
  const error = chat.error
    ? chat.error instanceof ApiError
      ? (chat.error.fieldError("listing") ?? chat.error.fieldError("order") ?? chat.error.message)
      : "Something went wrong. Please try again."
    : null;

  return (
    <div className={cn("grid gap-2", className)}>
      {/* Stays busy after success too, until the conversation opens. */}
      <Button variant={variant} loading={chat.isPending || chat.isSuccess} onClick={open}>
        <MessageCircle aria-hidden />
        {children}
      </Button>

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}