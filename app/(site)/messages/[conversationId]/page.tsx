import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";
import { ChatThread } from "@/components/messages/chat-thread";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false }, // private, nothing for search engines
};

type ConversationPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId: raw } = await params;

  // A conversation's address is its number. Anything else cannot be one, so there is nothing to ask the API about.
  if (!/^[1-9][0-9]{0,9}$/.test(raw)) notFound();

  const conversationId = Number(raw);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <RequireVerifiedUser
        next={`/messages/${conversationId}`}
        loginTitle="Log in to see this conversation"
        loginText="Log in with the account that was part of it."
        verifyText="Confirm your email address to send and read messages."
      >
        {/* key: moving to another conversation starts with a clean screen, never with the last one's scroll position. */}
        <ChatThread key={conversationId} conversationId={conversationId} />
      </RequireVerifiedUser>
    </div>
  );
}