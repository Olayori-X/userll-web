import Form from "next/form";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ListingSearch } from "@/lib/api/catalog";
import { hasActiveFilters, listingsHref, SORT_OPTIONS } from "@/lib/listing-filters";
import type { Category } from "@/lib/types/catalog";
import { cn } from "@/lib/utils";

type ListingFiltersProps = {
  /** The cleaned filters from the address. */
  filters: ListingSearch;
  categories: Category[];
};

const CHIP =
  "inline-flex cursor-pointer items-center rounded-full border border-input bg-card px-3.5 py-1.5 text-sm font-medium transition-colors " +
  "hover:border-primary/50 peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground " +
  "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40";

function CategoryList({ categories, filters }: ListingFiltersProps) {
  const linkClass = (active: boolean) =>
    cn(
      "block rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent",
      active ? "bg-accent font-semibold text-accent-foreground" : "text-foreground",
    );

  return (
    <nav aria-label="Categories" className="grid gap-1">
      <Link
        href={listingsHref(filters, { category: undefined })}
        aria-current={filters.category ? undefined : "true"}
        className={linkClass(!filters.category)}
      >
        All categories
      </Link>

      {categories.map((category) => {
        const isSelected = filters.category === category.slug;
        const childSelected = category.children.some((child) => child.slug === filters.category);

        return (
          <div key={category.id} className="grid gap-1">
            <Link
              href={listingsHref(filters, { category: category.slug })}
              aria-current={isSelected ? "true" : undefined}
              className={linkClass(isSelected)}
            >
              {category.name}
            </Link>

            {/* Sub-categories open up once their category (or one of them) is chosen. */}
            {(isSelected || childSelected) && category.children.length > 0 && (
              <ul className="ml-3 grid gap-1 border-l border-border pl-2">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={listingsHref(filters, { category: child.slug })}
                      aria-current={filters.category === child.slug ? "true" : undefined}
                      className={linkClass(filters.category === child.slug)}
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * The filters beside the results (above them on phones, folded behind a "Filters" button).
 *
 * The category list is made of links. Condition, price and sort are a plain GET form: it reloads the page with
 * a new address, so there is no browser code and it works even before JavaScript has loaded. The folding
 * is done with a hidden checkbox and CSS, for the same reason.
 */
export function ListingFilters({ filters, categories }: ListingFiltersProps) {
  const activeCount = [filters.category, filters.condition, filters.min_price, filters.max_price].filter(Boolean).length;

  return (
    <aside aria-label="Filters" className="grid gap-4 lg:sticky lg:top-28 lg:self-start">
      <input id="filters-toggle" type="checkbox" className="peer sr-only" />
      <label
        htmlFor="filters-toggle"
        className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-primary text-sm font-semibold text-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40 lg:hidden"
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filters{activeCount > 0 && ` (${activeCount})`}
      </label>

      <div className="hidden gap-6 rounded-xl border border-border bg-card p-4 peer-checked:grid lg:grid">
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Category</h2>
          <CategoryList categories={categories} filters={filters} />
        </section>

        <Form action="/listings" className="grid gap-6">
          {/* Keep what was searched and the chosen category when the form is sent. */}
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          {filters.category && <input type="hidden" name="category" value={filters.category} />}

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Condition</legend>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "", label: "Any" },
                { value: "new", label: "New" },
                { value: "used", label: "Used" },
              ].map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="condition"
                    value={option.value}
                    defaultChecked={(filters.condition ?? "") === option.value}
                    className="peer sr-only"
                  />
                  <span className={CHIP}>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Price (₦)</legend>
            <div className="flex items-center gap-2">
              <Input
                name="min_price"
                inputMode="decimal"
                placeholder="Min"
                aria-label="Lowest price in naira"
                defaultValue={filters.min_price}
                autoComplete="off"
                maxLength={13}
              />
              <span aria-hidden className="text-muted-foreground">
                –
              </span>
              <Input
                name="max_price"
                inputMode="decimal"
                placeholder="Max"
                aria-label="Highest price in naira"
                defaultValue={filters.max_price}
                autoComplete="off"
                maxLength={13}
              />
            </div>
          </fieldset>

          <div className="grid gap-2">
            <label htmlFor="sort" className="text-sm font-semibold">
              Sort by
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={filters.sort ?? "newest"}
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 md:text-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Button type="submit">Apply</Button>

            {hasActiveFilters(filters) && (
              <Link
                href={listingsHref({ q: filters.q })}
                className="text-center text-sm font-semibold text-primary hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>
        </Form>
      </div>
    </aside>
  );
}