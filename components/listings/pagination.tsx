import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  lastPage: number;
  /** The address of a page. The caller builds it, so the filters stay in place. */
  hrefFor: (page: number) => string;
  className?: string;
};

type Item = number | "gap";

/**
 * Which page numbers to show: the first, the last, and the pages around the current one, with "…" for
 * the stretches in between. For page 6 of 20: 1 … 5 6 7 … 20.
 */
function pageItems(current: number, last: number): Item[] {
  const pages = [...new Set([1, last, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= last)
    .sort((a, b) => a - b);

  const items: Item[] = [];

  pages.forEach((page, index) => {
    const previous = pages[index - 1];

    if (previous !== undefined) {
      // A gap of exactly one page is shown as that page, because "…" would hide no more than it takes to say.
      if (page - previous === 2) items.push(previous + 1);
      else if (page - previous > 2) items.push("gap");
    }

    items.push(page);
  });

  return items;
}

function StepLink({ href, direction }: { href: string | null; direction: "previous" | "next" }) {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;
  const label = isPrevious ? "Previous" : "Next";
  const classes = buttonVariants({ variant: "outline", size: "sm" });

  const content = (
    <>
      {isPrevious && <Icon aria-hidden />}
      <span className="hidden sm:inline">{label}</span>
      {!isPrevious && <Icon aria-hidden />}
    </>
  );

  // First or last page: nothing to go to, so show it dimmed instead of as a link.
  if (!href) {
    return (
      <span aria-disabled="true" aria-label={`${label} page`} className={classes}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} rel={isPrevious ? "prev" : "next"} aria-label={`${label} page`} className={classes}>
      {content}
    </Link>
  );
}

/** Previous and Next, with page numbers from tablets up. Phones get "Page 2 of 7" to save room. */
export function Pagination({ currentPage, lastPage, hrefFor, className }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1.5", className)}>
      <StepLink direction="previous" href={currentPage > 1 ? hrefFor(currentPage - 1) : null} />

      <p className="px-3 text-sm text-muted-foreground sm:hidden">
        Page {currentPage} of {lastPage}
      </p>

      <ul className="hidden items-center gap-1 sm:flex">
        {pageItems(currentPage, lastPage).map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden className="px-1.5 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              {item === currentPage ? (
                <span aria-current="page" className={cn(buttonVariants({ size: "icon-sm" }), "pointer-events-none")}>
                  {item}
                </span>
              ) : (
                <Link href={hrefFor(item)} aria-label={`Page ${item}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                  {item}
                </Link>
              )}
            </li>
          ),
        )}
      </ul>

      <StepLink direction="next" href={currentPage < lastPage ? hrefFor(currentPage + 1) : null} />
    </nav>
  );
}