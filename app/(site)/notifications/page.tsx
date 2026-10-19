import type { Metadata } from "next";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { toQueryString } from "@/lib/query-string";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false }, // private, nothing for search engines
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type NotificationsPageProps = {
  searchParams: Promise<{ unread?: string | string[]; page?: string | string[] }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const raw = await searchParams;

  const unreadOnly = first(raw.unread) === "1";

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  // If their login ran out, the login page brings them back to this same tab and page.
  const here = `/notifications${toQueryString({ unread: unreadOnly || undefined, page: page > 1 ? page : undefined })}`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Notifications</h1>

      <RequireVerifiedUser
        next={here}
        loginTitle="Log in to see your notifications"
        loginText="Updates about your orders, payments and messages are saved to your account."
        verifyText="Confirm your email address to see your notifications."
      >
        <NotificationsView unreadOnly={unreadOnly} page={page} />
      </RequireVerifiedUser>
    </div>
  );
}