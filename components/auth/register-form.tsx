"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { register as registerAccount } from "@/lib/api/auth";
import { applyApiErrors } from "@/lib/form-errors";
import { isStrongPassword, PASSWORD_RULE } from "@/lib/password-rules";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

// These mirror the API's own rules, so people see problems before anything is sent. The API still checks again.
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const normalizePhone = (value: string) => value.replace(/[\s\-()]/g, "");

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your full name.").max(100, "Your name can be 100 characters at most."),
    email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
    phone: z
      .string()
      .trim()
      .min(1, "Enter your phone number.")
      .refine((value) => PHONE_PATTERN.test(normalizePhone(value)), "Enter a valid phone number, for example 08012345678."),
    password: z.string().min(1, "Choose a password.").refine(isStrongPassword, PASSWORD_RULE),
    password_confirmation: z.string().min(1, "Type your password again."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords do not match.",
  });

type RegisterValues = z.infer<typeof registerSchema>;

const FIELDS = ["name", "email", "phone", "password", "password_confirmation"] as const;

type RegisterFormProps = {
  /** Where they were heading before they were asked to sign up. The page has already made it safe. */
  redirectTo: string;
};

export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter();
  const { status, signIn } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  // Signing in makes the session "authenticated" a moment before we navigate. This stops the
  // "already logged in, go away" check below from racing our own redirect.
  const justRegistered = useRef(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", password_confirmation: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const mutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: ({ user }) => {
      justRegistered.current = true;
      signIn(user);

      // New accounts start unverified, and most actions need a verified email, so the next stop is the "check your inbox" page.
      router.replace(redirectTo === "/" ? "/verify-email" : `/verify-email?next=${encodeURIComponent(redirectTo)}`);
      router.refresh();
    },
    onError: (error) => setFormError(applyApiErrors(error, setError, FIELDS)),
  });

  useEffect(() => {
    if (status === "authenticated" && !justRegistered.current) router.replace(redirectTo);
  }, [status, redirectTo, router]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    mutation.mutate({ ...values, phone: normalizePhone(values.phone) });
  });

  const loginHref = redirectTo === "/" ? "/login" : `/login?next=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Join Userll to buy and sell with trusted people.</p>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormField label="Full name" error={errors.name?.message}>
          {(control) => <Input autoComplete="name" placeholder="Ada Obi" {...register("name")} {...control} />}
        </FormField>

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

        <FormField label="Phone number" error={errors.phone?.message} hint="Used for order updates. Never shown to other people.">
          {(control) => (
            <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="08012345678" {...register("phone")} {...control} />
          )}
        </FormField>

        <FormField label="Password" error={errors.password?.message} hint={PASSWORD_RULE}>
          {(control) => <PasswordInput autoComplete="new-password" {...register("password")} {...control} />}
        </FormField>

        <FormField label="Confirm password" error={errors.password_confirmation?.message}>
          {(control) => <PasswordInput autoComplete="new-password" {...register("password_confirmation")} {...control} />}
        </FormField>

        <Button type="submit" size="lg" className="mt-2 w-full" loading={mutation.isPending || mutation.isSuccess}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}