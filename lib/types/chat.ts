/** Conversations and messages between a buyer and a seller. Buyers and sellers use the same ones. */

/** "listing": a buyer asking about something for sale. "order": about an order that has been paid. */
export type ConversationKind = "listing" | "order";

/** A conversation as the inbox shows it. */
export type Conversation = {
  id: number;
  kind: ConversationKind;
  /**
   * The person on the other side. A buyer sees the seller's shop name. A seller sees the buyer's first name
   * and an initial ("Ada O.").
   */
  other_party: {
    name: string;
    /** The shop's slug, for a link to its page. Null when the person looking is the seller. */
    store_slug: string | null;
  };
  /** What the conversation is about, when it started from a listing. */
  listing: { id: number; slug: string; title: string } | null;
  /** The order it is about, when it started from an order. */
  order_number: string | null;
  last_message: {
    /** The first 100 characters. */
    preview: string;
    is_mine: boolean;
    sent_at: string;
  } | null;
  /** How many messages sent to this person are still unread. */
  unread_count: number;
  /** A timestamp, or null while nothing has been said yet. */
  last_message_at: string | null;
};

export type Message = {
  id: number;
  conversation_id: number;
  /** Plain text, up to 2000 characters. Show it as text: never as HTML. */
  body: string;
  is_mine: boolean;
  /** For my own messages: has the other person read it? Null for theirs, which is not mine to know. */
  is_read: boolean | null;
  sent_at: string;
};

/** One conversation opened: its details, the latest messages (oldest first), and whether older ones exist. */
export type ConversationThread = {
  conversation: Conversation;
  messages: Message[];
  /** True when there are earlier messages than the ones sent. Ask for them with ?before=<oldest message id>. */
  has_more: boolean;
};