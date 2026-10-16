/**
 * Messages between buyers and sellers. Needs a login and a verified email. The same calls serve both sides:
 * which side you are on only changes how names appear.
 *
 * There are no live pushes. The screens ask again every few seconds while they are open (see hooks/use-chat.ts).
 */

import { api } from "@/lib/api";
import type { Paginated, Wrapped } from "@/lib/types/common";
import type { Conversation, ConversationThread, Message } from "@/lib/types/chat";

const unwrap = <T>({ data }: Wrapped<T>) => data;

/** A message is plain text, 1 to 2000 characters. */
export const MAX_MESSAGE_LENGTH = 2000;

/** The inbox: conversations that have at least one message, the most recently active first, 20 to a page. */
export function getConversations(page = 1) {
  return api.get<Paginated<Conversation>>("/conversations", { query: { page: page > 1 ? page : undefined } });
}

/** Just the number, for the badge on the messages icon. A single cheap call. */
export function getUnreadCount() {
  return api.get<Wrapped<{ unread_count: number }>>("/conversations/unread-count").then((result) => unwrap(result).unread_count);
}

/**
 * Asks a seller about a listing. If a conversation about it already exists, that one comes back,
 * so pressing the button twice is harmless. Errors arrive as `listing`: "You cannot message yourself about your own listing."
 */
export function startListingConversation(listingSlug: string) {
  return api.post<Wrapped<Conversation>>(`/listings/${encodeURIComponent(listingSlug)}/conversation`).then(unwrap);
}

/** Chat about an order, for its buyer or its seller, once it is paid. Existing conversations come back as they are. */
export function startOrderConversation(orderNumber: string) {
  return api.post<Wrapped<Conversation>>(`/orders/${encodeURIComponent(orderNumber)}/conversation`).then(unwrap);
}

/**
 * A conversation with its latest 50 messages, oldest first. For older ones, pass the id of the oldest
 * message you have: the 50 before it come back.
 */
export function getThread(conversationId: number, before?: number) {
  return api.get<Wrapped<ConversationThread>>(`/conversations/${conversationId}`, { query: { before } }).then(unwrap);
}

/** Sends a message. Error field `body`: empty, or longer than 2000 characters. */
export function sendMessage(conversationId: number, body: string) {
  return api.post<Wrapped<Message>>(`/conversations/${conversationId}/messages`, { body }).then(unwrap);
}

/** Marks everything sent to me in this conversation as read. Returns my new total of unread messages. */
export function markConversationRead(conversationId: number) {
  return api
    .post<Wrapped<{ marked: number; unread_count: number }>>(`/conversations/${conversationId}/read`)
    .then(unwrap);
}