import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A text field. Set aria-invalid on it (forms will do this when the API reports a problem with the field)
 * and it turns red. Pair it with a <Label htmlFor="..."> whose htmlFor matches this field's id.
 */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        // text-base on phones: smaller text makes iPhones zoom into the field when it is tapped
        "h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base text-foreground transition-colors outline-none md:text-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        // the "choose file" button inside file fields (KYC photos, listing images)
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-primary",
        className,
      )}
      {...props}
    />
  );
}