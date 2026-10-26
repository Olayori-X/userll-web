import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A dropdown: the state, the category, the kind of ID, the bank. It is the browser's own <select>, so phones show
 * their native picker, which is better than anything we could draw. Use it exactly like <Input> inside a <FormField>:
 * spread `register(...)` and the `control` props onto it, and put <option> elements inside.
 */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        // text-base on phones: smaller text makes iPhones zoom into the field when it is tapped
        "h-10 w-full rounded-md border border-input bg-card px-3 text-base text-foreground transition-colors outline-none md:text-sm",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}