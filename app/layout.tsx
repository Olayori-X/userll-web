import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Userll: everything you need, from real people",
    template: "%s · Userll",
  },
  description: "Buy and sell with trusted people. Pay safely and get paid when your order arrives.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {/* Order matters: the session provider reads from the query cache, so the query provider goes outside it. */}
        <QueryProvider>
          <SessionProvider>{children}</SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}