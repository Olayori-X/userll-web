import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** What the field itself must receive, so the label, hint and error are connected to it. */
export type FieldControlProps = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

type FormFieldProps = {
  label: string;
  /** The problem with this field, if there is one. Shown in red under the field. */
  error?: string;
  /** Help shown under the field while there is no error, for example "Use the name on your ID". */
  hint?: string;
  /** Adds "(optional)" after the label. Required fields are left unmarked, which is less noisy. */
  optional?: boolean;
  className?: string;
  /** Receives the props to spread onto the field. */
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * One form field: label, the field, then a hint or an error.
 *
 *   <FormField label="Email" error={errors.email?.message}>
 *     {(control) => <Input type="email" autoComplete="email" {...register("email")} {...control} />}
 *   </FormField>
 *
 * Spread `control` after `register(...)`. It sets the field's id (so tapping the label focuses it), marks it
 * invalid when there is an error, and tells screen readers which message belongs to it.
 */
export function FormField({ label, error, hint, optional = false, className, children }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </Label>

      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })}

      {message && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("text-xs", error ? "font-medium text-destructive" : "text-muted-foreground")}
        >
          {message}
        </p>
      )}
    </div>
  );
}