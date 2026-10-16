import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A multi-line text field: the problem report, a review, later chat messages and a shop description.
 * It looks like <Input> and works the same way: spread `register(...)` and the `control` from a
 * <FormField> onto it, and set maxLength to the API's limit for that field.
 */
export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(
        // text-base on phones: smaller text makes iPhones zoom into the field when it is tapped
        "min-h-24 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-base text-foreground transition-colors outline-none md:text-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        className,
      )}
      {...props}
    />
  );
}