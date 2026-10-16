"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers/session-provider";
import {
  getConversations,
  getThread,
  getUnreadCount,
  markConversationRead,
  sendMessage,
  startListingConversation,
  startOrderConversation,
} from "@/lib/api/chat";
import type { ConversationThread, Message } from "@/lib/types/chat";

/** Everything about chat lives under ["chat", ...] in the cache, so logging out wipes it all. */
const CHAT_KEY = ["chat"] as const;
const UNREAD_KEY = [...CHAT_KEY, "unread"] as const;
const inboxKey = (page: number) => [...CHAT_KEY, "inbox", page] as const;
const threadKey = (conversationId: number) => [...CHAT_KEY, "thread", conversationId] as const;

/** How often each screen asks again. The API has no live push, so this is what makes chat feel live. */
const THREAD_POLL_MS = 5_000;
const INBOX_POLL_MS = 20_000;
const UNREAD_POLL_MS = 30_000;

/** Like the cart and orders: only asked for someone who can chat (logged in, email verified). */
function useCanChat() {
  const { user } = useSession();

  return Boolean(user?.email_verified);
}

/** The number for the badge on the messages icon. Asked again every 30 seconds while the tab is in view. */
export function useUnreadCount(): number {
  const query = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: getUnreadCount,
    enabled: useCanChat(),
    refetchInterval: UNREAD_POLL_MS,
  });

  return query.data ?? 0;
}

/** One page of the inbox. Checked again every 20 seconds, and the old page stays visible while a new one loads. */
export function useConversations(page = 1) {
  return useQuery({
    queryKey: inboxKey(page),
    queryFn: () => getConversations(page),
    enabled: useCanChat(),
    placeholderData: keepPreviousData,
    refetchInterval: INBOX_POLL_MS,
  });
}

/** Tells the API that everything sent to me here is read, and brings the badge and inbox up to date. */
function useMarkRead(conversationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: ({ unread_count }) => {
      queryClient.setQueryData(UNREAD_KEY, unread_count);
      queryClient.setQueryData<ConversationThread>(threadKey(conversationId), (thread) =>
        thread ? { ...thread, conversation: { ...thread.conversation, unread_count: 0 } } : thread,
      );
      void queryClient.invalidateQueries({ queryKey: [...CHAT_KEY, "inbox"] });
    },
  });
}

/** Messages in order, oldest first. A message that appears twice (loaded early and polled later) is kept once. */
function mergeMessages(older: Message[], latest: Message[]): Message[] {
  const byId = new Map<number, Message>();

  for (const message of [...older, ...latest]) byId.set(message.id, message);

  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/**
 * One open conversation: its latest messages (checked again every 5 seconds), earlier ones on request,
 * and everything sent to me marked as read while I am looking at it.
 *
 * Give the screen showing it key={conversationId}, so moving between conversations starts clean.
 */
export function useThread(conversationId: number) {
  const latest = useQuery({
    queryKey: threadKey(conversationId),
    queryFn: () => getThread(conversationId),
    enabled: useCanChat(),
    refetchInterval: THREAD_POLL_MS,
  });

  // Earlier messages are loaded by hand ("Load earlier messages") and kept here, apart from the polled latest ones.
  const [older, setOlder] = useState<Message[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null); // null until one older page was loaded
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderFailed, setOlderFailed] = useState(false);

  const messages = useMemo(() => mergeMessages(older, latest.data?.messages ?? []), [older, latest.data?.messages]);
  const hasMore = olderHasMore ?? latest.data?.has_more ?? false;

  const loadOlder = useCallback(async () => {
    const oldestId = messages[0]?.id;

    if (oldestId === undefined || loadingOlder) return;

    setLoadingOlder(true);
    setOlderFailed(false);

    try {
      const page = await getThread(conversationId, oldestId);

      setOlder((current) => [...page.messages, ...current]);
      setOlderHasMore(page.has_more);
    } catch {
      setOlderFailed(true);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, messages, loadingOlder]);

  // Mark as read when there is something unread. Tried once per unread count, so a failure does not loop.
  const { mutate: markRead } = useMarkRead(conversationId);
  const unread = latest.data?.conversation.unread_count ?? 0;
  const attemptedFor = useRef(0);

  useEffect(() => {
    if (unread === 0) {
      attemptedFor.current = 0;
    } else if (attemptedFor.current !== unread) {
      attemptedFor.current = unread;
      markRead();
    }
  }, [unread, markRead]);

  return {
    conversation: latest.data?.conversation ?? null,
    messages,
    hasMore,
    loadOlder,
    loadingOlder,
    olderFailed,
    /** True until the first answer arrives. */
    isPending: latest.isPending,
    /** True when there is no data at all. A failed check while messages are on screen is not an error. */
    isError: latest.isError && !latest.data,
    error: latest.error,
    refetch: latest.refetch,
  };
}

/**
 * Sends a message. The saved message is added to the screen straight away, without waiting for the next check.
 * Never repeated automatically: a failed send shows its error and the text stays in the box.
 */
export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => sendMessage(conversationId, body),
    onSuccess: (message) => {
      queryClient.setQueryData<ConversationThread>(threadKey(conversationId), (thread) =>
        thread ? { ...thread, messages: [...thread.messages.filter((item) => item.id !== message.id), message] } : thread,
      );
      void queryClient.invalidateQueries({ queryKey: [...CHAT_KEY, "inbox"] });
      void queryClient.invalidateQueries({ queryKey: UNREAD_KEY }); // sending counts as having read what came before
    },
  });
}

/** "Message seller" on a listing. Gives back the conversation to open (an existing one, if there is one). */
export const useStartListingChat = () => useMutation({ mutationFn: (listingSlug: string) => startListingConversation(listingSlug) });

/** "Message seller" or "Message buyer" on an order. */
export const useStartOrderChat = () => useMutation({ mutationFn: (orderNumber: string) => startOrderConversation(orderNumber) });