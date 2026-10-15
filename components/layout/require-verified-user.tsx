"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole, MailWarning } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

/** Grey placeholder blocks while a page finds out who is looking, or loads its data. */
export function PageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid gap-4" role="status">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** A centred card with an icon, a heading and something to do. For empty lists, "log in first", and the like. */
export function PageNotice({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">{icon}</div>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

type RequireVerifiedUserProps = {
  /** This page's own address, so logging in or verifying brings the person straight back: "/checkout". */
  next: string;
  /** The heading for a visitor who is not logged in: "Log in to check out". */
  loginTitle: string;
  loginText?: string;
  verifyText?: string;
  children: ReactNode;
};

/**
 * Wraps a page that needs a logged-in person with a verified email: the cart, checkout, orders, messages.
 * Until then it shows the right screen for each situation (still finding out, logged out, unverified, or the API
 * being unreachable), and renders the page only when it can really work.
 *
 * This only decides what is shown. The API still refuses anyone who is not allowed.
 */
export function RequireVerifiedUser({
  next,
  loginTitle,
  loginText = "Your account keeps everything in one place.",
  verifyText = "Confirm your email address to continue.",
  children,
}: RequireVerifiedUserProps) {
  const { user, status } = useSession();

  if (status === "loading") return <PageSkeleton />;

  if (status === "error") {
    return <Alert variant="error">We couldn&apos;t load your account. Check your connection and refresh the page.</Alert>;
  }

  if (!user) {
    return (
      <PageNotice icon={<LockKeyhole className="size-7" aria-hidden />} title={loginTitle}>
        <p className="text-sm text-muted-foreground">{loginText}</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonVariants({ size: "lg" })}>
          Log in
        </Link>
      </PageNotice>
    );
  }

  if (!user.email_verified) {
    return (
      <PageNotice icon={<MailWarning className="size-7" aria-hidden />} title="Verify your email first">
        <p className="text-sm text-muted-foreground">{verifyText}</p>
        <Link href={`/verify-email?next=${encodeURIComponent(next)}`} className={buttonVariants({ size: "lg" })}>
          Verify now
        </Link>
      </PageNotice>
    );
  }

  return <>{children}</>;
}