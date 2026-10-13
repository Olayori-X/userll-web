import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** The frame around every account page: logo on top, one centred card, the tagline underneath. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-4 py-5 sm:px-8">
        <Logo height={32} />
      </header>

      {/* Top-aligned on phones so the keyboard never covers the form, centred from tablets up. */}
      <main className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
        Real people. Real products. Real progress.
      </footer>
    </div>
  );
}