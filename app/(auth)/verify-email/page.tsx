import type { Metadata } from "next";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false }, // account pages should not appear in search results
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { next } = await searchParams;

  return <VerifyEmailPanel redirectTo={safeRedirectPath(next)} />;
}