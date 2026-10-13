import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot your password?",
  robots: { index: false }, // account pages should not appear in search results
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}