"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, MailCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getCurrentUser, resendVerificationEmail } from "@/lib/api/auth";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** The API allows 6 resends a minute. A 60-second wait keeps people well clear of that. */
const RESEND_WAIT_SECONDS = 60;

type VerifyEmailPanelProps = {
  /** Where to go once verified, or when they choose to skip. The page has already made it safe. */
  redirectTo: string;
};

export function VerifyEmailPanel({ redirectTo }: VerifyEmailPanelProps) {
  const router = useRouter();
  const { user, status, signIn } = useSession();

  const [wait, setWait] = useState(0);
  const [checking, setChecking] = useState(false);
  const [notVerifiedYet, setNotVerifiedYet] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  /** Asks the API for the latest version of the account. If the email is now verified, the effect below moves on. */
  const syncUser = useCallback(async () => {
    const fresh = await getCurrentUser();

    if (fresh) signIn(fresh);

    return fresh;
  }, [signIn]);

  const resend = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => {
      setWait(RESEND_WAIT_SECONDS);
      setNotVerifiedYet(false);
      void syncUser().catch(() => {}); // if they verified in the meantime, the effect below moves them on
    },
  });

  // Verified (here, or on another device): carry on.
  useEffect(() => {
    if (status === "authenticated" && user?.email_verified) router.replace(redirectTo);
  }, [status, user?.email_verified, redirectTo, router]);

  // Not logged in: this page needs an account, and the login page brings them back here.
  useEffect(() => {
    if (status !== "unauthenticated") return;

    const here = redirectTo === "/" ? "/verify-email" : `/verify-email?next=${encodeURIComponent(redirectTo)}`;

    router.replace(`/login?next=${encodeURIComponent(here)}`);
  }, [status, redirectTo, router]);

  // They click the link in their email app and come back to this tab: check straight away.
  useEffect(() => {
    const onFocus = () => void syncUser().catch(() => {});

    window.addEventListener("focus", onFocus);

    return () => window.removeEventListener("focus", onFocus);
  }, [syncUser]);

  // Counts the wait down, one second at a time.
  useEffect(() => {
    if (wait <= 0) return;

    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);

    return () => clearTimeout(timer);
  }, [wait]);

  async function checkNow() {
    setChecking(true);
    setCheckError(null);
    setNotVerifiedYet(false);

    try {
      const fresh = await syncUser();

      if (fresh && !fresh.email_verified) setNotVerifiedYet(true);
    } catch (error) {
      setCheckError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  if (status === "error") {
    return <Alert variant="error">We couldn&apos;t load your account. Check your connection and refresh the page.</Alert>;
  }

  if (!user) {
    return (
      <div className="flex justify-center py-10" role="status">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  const resendError = resend.error instanceof ApiError ? resend.error.message : resend.error ? "Something went wrong. Please try again." : null;

  return (
    <div className="grid gap-6">
      <div className="grid justify-items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
          <MailCheck className="size-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to <span className="font-semibold break-all text-foreground">{user.email}</span>.
          Open it to confirm your email address, then come back here.
        </p>
      </div>

      {resend.isSuccess && !resendError && (
        <Alert variant="success">A new link is on its way. It can take a minute to arrive.</Alert>
      )}
      {notVerifiedYet && (
        <Alert variant="warning">Not verified yet. Open the link in your email, then try again.</Alert>
      )}
      {(resendError || checkError) && <Alert variant="error">{resendError ?? checkError}</Alert>}

      <div className="grid gap-3">
        <Button size="lg" onClick={checkNow} loading={checking}>
          I&apos;ve verified my email
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => resend.mutate()}
          loading={resend.isPending}
          disabled={wait > 0}
        >
          {wait > 0 ? `Send again in ${wait}s` : "Send the link again"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">Can&apos;t find it? Check your spam or junk folder.</p>

      <div className="text-center">
        <Link href={redirectTo} className="text-sm font-semibold text-primary hover:underline">
          Skip for now
        </Link>
      </div>
    </div>
  );
}