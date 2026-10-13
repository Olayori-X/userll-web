import type { Metadata } from "next";
import { EmailVerifiedPanel } from "@/components/auth/email-verified-panel";

export const metadata: Metadata = {
  title: "Email confirmed",
  robots: { index: false }, // account pages should not appear in search results
};

export default function EmailVerifiedPage() {
  return <EmailVerifiedPanel />;
}