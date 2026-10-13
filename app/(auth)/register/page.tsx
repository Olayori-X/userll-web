import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false }, // account pages should not appear in search results
};

type RegisterPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { next } = await searchParams;

  return <RegisterForm redirectTo={safeRedirectPath(next)} />;
}