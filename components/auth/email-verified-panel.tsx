"use client";

import Link from "next/link";
import { CircleCheck, LoaderCircle, Mail } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Where the link in the verification email lands. It cannot assume a session: people often open the email on
 * a different device from the one they signed up on. So it tells the truth about whatever it can see.
 */
export function EmailVerifiedPanel() {
  const { user, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex justify-center py-10" role="status">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (status === "error") {
    return <Alert variant="error">We couldn&apos;t load your account. Check your connection and refresh the page.</Alert>;
  }

  // Logged in here, and the API still says unverified: somebody typed the address in without using the link.
  if (status === "authenticated" && user && !user.email_verified) {
    return (
      <div className="grid justify-items-center gap-6 text-center">
        <div className="grid justify-items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning">
            <Mail className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Not verified yet</h1>
          <p className="text-sm text-muted-foreground">
            We haven&apos;t seen your confirmation. Open the link in your email, or ask for a new one.
          </p>
        </div>

        <Link href="/verify-email" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Back to verification
        </Link>
      </div>
    );
  }

  const loggedIn = status === "authenticated";

  return (
    <div className="grid justify-items-center gap-6 text-center">
      <div className="grid justify-items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CircleCheck className="size-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Email confirmed</h1>
        <p className="text-sm text-muted-foreground">
          {loggedIn
            ? "Thank you. Your account is ready for buying and selling."
            : "Thank you. Log in to start buying and selling."}
        </p>
      </div>

      <Link href={loggedIn ? "/" : "/login"} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        {loggedIn ? "Start shopping" : "Log in"}
      </Link>
    </div>
  );
}