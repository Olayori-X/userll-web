import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-md border p-3 text-sm", {
  variants: {
    variant: {
      /** Something failed: a wrong password, a rejected payment, the server being down. */
      error: "border-destructive/20 bg-danger-soft text-destructive",
      /** Something worked, or is complete. */
      success: "border-success/20 bg-success-soft text-success",
      /** Needs attention but is not broken: a payout on hold, an email still unverified. */
      warning: "border-warning/25 bg-warning-soft text-warning",
      /** Neutral news: "Your session ended. Please log in again." */
      info: "border-info/20 bg-info-soft text-info",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = {
  error: CircleAlert,
  success: CircleCheck,
  warning: TriangleAlert,
  info: Info,
} as const;

type AlertProps = Omit<ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & {
    /** A short bold line above the message. */
    title?: string;
  };

/**
 *   <Alert variant="error">That email or password is not right.</Alert>
 *
 * Errors and warnings are announced by screen readers straight away. Success and info messages wait their
 * turn, so they do not interrupt what the person is doing.
 */
export function Alert({ className, variant = "info", title, children, ...props }: AlertProps) {
  const Icon = icons[variant ?? "info"];
  const urgent = variant === "error" || variant === "warning";

  return (
    <div
      data-slot="alert"
      role={urgent ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="grid gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-snug">{children}</div>
      </div>
    </div>
  );
}