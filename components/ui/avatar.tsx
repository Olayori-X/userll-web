import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
} as const;

/** "Ada Obi" -> "AO", "Ada" -> "A", "  " -> "?". Takes whole characters, so accented letters and emoji stay intact. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";

  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";

  return (first + last).toUpperCase();
}

type AvatarProps = Omit<ComponentProps<"span">, "children"> & {
  /** The person's name. The API has no profile photos, so the badge shows their initials. */
  name: string;
  size?: keyof typeof SIZES;
};

/**
 * Decorative: hidden from screen readers, because the person's name is always written out next to it
 * (or in the label of the button it sits in).
 */
export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground select-none",
        SIZES[size],
        className,
      )}
      {...props}
    >
      {initialsOf(name)}
    </span>
  );
}