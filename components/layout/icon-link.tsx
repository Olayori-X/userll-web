import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconLinkProps = {
  href: string;
  /** What a screen reader says for a given count: "Cart, 3 items". */
  label: (count: number) => string;
  /** The number on the little red badge. Nothing is shown for 0. */
  count?: number;
  children: ReactNode;
};

/** A round icon button that is a link, with an optional red count badge: the cart, messages, notifications. */
export function IconLink({ href, label, count = 0, children }: IconLinkProps) {
  return (
    <Link href={href} aria-label={label(count)} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}>
      {children}
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-5 font-bold text-primary-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}