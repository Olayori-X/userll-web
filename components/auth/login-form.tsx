"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { login } from "@/lib/api/auth";
import { applyApiErrors } from "@/lib/form-errors";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

// Only checks that something was typed. Password rules belong to registration, not to logging in.
const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  /** Where to go after signing in. The page has already made it safe with safeRedirectPath. */
  redirectTo: string;
  /** True when the visitor was sent here because their session ended. */
  sessionExpired?: boolean;
};

export function LoginForm({ redirectTo, sessionExpired = false }: LoginFormProps) {
  const router = useRouter();
  const { status, signIn } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    resetField,
    formState: { errors },
  } = form;

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => {
      signIn(user);
      router.replace(redirectTo);
      router.refresh();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.isUnauthenticated) {
        // Same answer for "no such account" and "wrong password", on purpose. Keep the email, clear the password.
        setFormError("That email or password is not right. Please check and try again.");
        resetField("password");
        setFocus("password");

        return;
      }

      setFormError(applyApiErrors(error, setError, ["email", "password"]));
    },
  });

  // Someone who is already logged in has no business here (for example the Back button after logging in).
  useEffect(() => {
    if (status === "authenticated" && !mutation.isSuccess) router.replace(redirectTo);
  }, [status, mutation.isSuccess, redirectTo, router]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values);
  });

  // Carry the destination over, so someone who decides to register still lands where they were heading.
  const registerHref = redirectTo === "/" ? "/register" : `/register?next=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to keep shopping or manage your store.</p>
      </div>

      {sessionExpired && !formError && <Alert variant="info">Your session ended. Please log in again.</Alert>}
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

        <FormField label="Password" error={errors.password?.message}>
          {(control) => (
            <PasswordInput
              autoComplete="current-password"
              placeholder="Your password"
              {...register("password")}
              {...control}
            />
          )}
        </FormField>

        <div className="-mt-2 flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Stays in its busy state after success too, until the page changes, so nothing is submitted twice. */}
        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending || mutation.isSuccess}>
          Log in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to Userll?{" "}
        <Link href={registerHref} className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}