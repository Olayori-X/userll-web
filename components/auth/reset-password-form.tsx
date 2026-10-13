"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/api/auth";
import { applyApiErrors } from "@/lib/form-errors";
import { isStrongPassword, PASSWORD_RULE } from "@/lib/password-rules";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";

const resetSchema = z
  .object({
    password: z.string().min(1, "Choose a new password.").refine(isStrongPassword, PASSWORD_RULE),
    password_confirmation: z.string().min(1, "Type your new password again."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords do not match.",
  });

type ResetValues = z.infer<typeof resetSchema>;

const FIELDS = ["password", "password_confirmation"] as const;

type ResetPasswordFormProps = {
  /** Both come from the link in the email. Either may be missing if the link was cut off or typed by hand. */
  token?: string;
  email?: string;
};

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  if (!token || !email) {
    return <LinkProblem message="This reset link looks incomplete. Open the link from your email again, or ask for a new one." />;
  }

  return <ResetForm token={token} email={email} />;
}

function LinkProblem({ message }: { message: string }) {
  return (
    <div className="grid justify-items-center gap-6 text-center">
      <div className="grid justify-items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning">
          <TriangleAlert className="size-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">This link can&apos;t be used</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      <Link href="/forgot-password" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        Get a new link
      </Link>
    </div>
  );
}

function ResetForm({ token, email }: { token: string; email: string }) {
  const { refresh } = useSession();
  const [formError, setFormError] = useState<string | null>(null);
  /** Set when the API says the link itself is no good (expired, already used, or altered). */
  const [linkProblem, setLinkProblem] = useState<string | null>(null);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", password_confirmation: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const mutation = useMutation({
    mutationFn: (values: ResetValues) => resetPassword({ token, email, ...values }),
    onSuccess: () => {
      // The API signed them out everywhere. If this browser still holds a session, this finds out and clears it.
      void refresh();
    },
    onError: (error) => {
      // A 422 with no field errors is the API saying the link is invalid or has expired.
      if (error instanceof ApiError && error.isValidation && Object.keys(error.errors).length === 0) {
        setLinkProblem(error.message);

        return;
      }

      setFormError(applyApiErrors(error, setError, FIELDS));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values);
  });

  if (linkProblem) return <LinkProblem message={linkProblem} />;

  if (mutation.isSuccess) {
    return (
      <div className="grid justify-items-center gap-6 text-center">
        <div className="grid justify-items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
            <CircleCheck className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Password changed</h1>
          <p className="text-sm text-muted-foreground">
            For your security, you&apos;ve been signed out everywhere. Log in with your new password.
          </p>
        </div>

        <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          For <span className="font-semibold break-all text-foreground">{email}</span>
        </p>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {/* Lets password managers save the new password against the right account. Nobody sees or edits it. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />

        <FormField label="New password" error={errors.password?.message} hint={PASSWORD_RULE}>
          {(control) => <PasswordInput autoComplete="new-password" {...register("password")} {...control} />}
        </FormField>

        <FormField label="Confirm new password" error={errors.password_confirmation?.message}>
          {(control) => <PasswordInput autoComplete="new-password" {...register("password_confirmation")} {...control} />}
        </FormField>

        <Button type="submit" size="lg" className="mt-2 w-full" loading={mutation.isPending}>
          Change password
        </Button>
      </form>
    </div>
  );
}