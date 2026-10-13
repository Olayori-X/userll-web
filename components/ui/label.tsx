import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * The visible name of a field. Always give it htmlFor, matching the id of its input: that is what makes
 * tapping the label focus the field, and what lets screen readers announce the name.
 */
export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm leading-none font-semibold text-foreground select-none", className)}
      {...props}
    />
  );
}