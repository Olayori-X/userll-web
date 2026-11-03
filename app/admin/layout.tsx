import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  // Each page sets its own short title ("Disputes"), and this wraps it: "Disputes · Admin · Userll".
  title: { default: "Admin console", template: "%s · Admin · Userll" },
  robots: { index: false }, // private pages, nothing for search engines
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}