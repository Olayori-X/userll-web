"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { z } from "zod";
import { forgotPassword } from "@/lib/api/auth";
import { applyApiErrors } from "@/lib/form-errors";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const forgotSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  /** The address we just asked the API about. Set once the request goes through. */
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = form;

  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (_result, email) => setSentTo(email),
    onError: (error) => setFormError(applyApiErrors(error, setError, ["email"])),
  });

  const onSubmit = handleSubmit(({ email }) => {
    setFormError(null);
    mutation.mutate(email);
  });

  function tryAnotherEmail() {
    mutation.reset();
    reset();
    setFormError(null);
    setSentTo(null);
  }

  if (sentTo) {
    return (
      <div className="grid gap-6">
        <div className="grid justify-items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
            <MailCheck className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          {/* Worded as "if", because the API never says whether an address has an account. */}
          <p className="text-sm text-muted-foreground">
            If <span className="font-semibold break-all text-foreground">{sentTo}</span> has a Userll account, we&apos;ve
            sent a link to reset its password. It can take a minute to arrive, and the link stops working after a
            while, so use it soon.
          </p>
        </div>

        <div className="grid gap-3">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Back to log in
          </Link>
          <Button variant="ghost" onClick={tryAnotherEmail}>
            Use a different email
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">Can&apos;t find it? Check your spam or junk folder.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to choose a new one.
        </p>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormField label="Email" error={errors.email?.message}>
          {(control) => (
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              {...register("email")}
              {...control}
            />
          )}
        </FormField>

        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}