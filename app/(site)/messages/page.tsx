import type { Metadata } from "next";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";
import { ConversationList } from "@/components/messages/conversation-list";
import { toQueryString } from "@/lib/query-string";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false }, // private, nothing for search engines
};

type MessagesPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const raw = await searchParams;

  const value = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const parsed = Number.parseInt(value ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  // If their login ran out, the login page brings them back to this same page of the inbox.
  const here = `/messages${toQueryString({ page: page > 1 ? page : undefined })}`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Messages</h1>

      <RequireVerifiedUser
        next={here}
        loginTitle="Log in to see your messages"
        loginText="Your conversations with buyers and sellers are saved to your account."
        verifyText="Confirm your email address to send and read messages."
      >
        <ConversationList page={page} />
      </RequireVerifiedUser>
    </div>
  );
}