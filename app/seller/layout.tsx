import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SellerShell } from "@/components/seller/seller-shell";

export const metadata: Metadata = {
  // Each page sets its own short title ("Products"), and this wraps it: "Products · Seller · Userll".
  title: { default: "Seller dashboard", template: "%s · Seller · Userll" },
  robots: { index: false }, // private pages, nothing for search engines
};

export default function SellerLayout({ children }: { children: ReactNode }) {
  return <SellerShell>{children}</SellerShell>;
}