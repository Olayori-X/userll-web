import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false }, // account pages should not appear in search results
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[]; expired?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, expired } = await searchParams;
  const expiredFlag = Array.isArray(expired) ? expired[0] : expired;

  return <LoginForm redirectTo={safeRedirectPath(next)} sessionExpired={expiredFlag === "1"} />;
}