import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false }, // account pages should not appear in search results
  // The reset token is in this page's address. This stops the browser passing that address on to anything we link to.
  referrer: "no-referrer",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[]; email?: string | string[] }>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token, email } = await searchParams;

  return <ResetPasswordForm token={first(token)} email={first(email)} />;
}