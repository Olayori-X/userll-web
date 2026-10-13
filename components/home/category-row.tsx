import Link from "next/link";
import { Footprints, Gem, House, Laptop, Shirt, Smartphone, Sparkles, Tag, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/types/catalog";

/** An icon for each starter category, by slug. Categories an admin adds later get the generic tag. */
const ICONS: Record<string, LucideIcon> = {
  "phones-tablets": Smartphone,
  electronics: Laptop,
  clothes: Shirt,
  shoes: Footprints,
  "jewelry-accessories": Gem,
  "home-garden": House,
  "beauty-health": Sparkles,
};

/** "Shop by category": one tile per top-level category, each opening the listings for it. */
export function CategoryRow({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="categories-heading" className="grid gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="categories-heading" className="text-xl font-bold tracking-tight">
          Shop by category
        </h2>
        <Link href="/listings" className="text-sm font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
        {categories.map((category) => {
          const Icon = ICONS[category.slug] ?? Tag;

          return (
            <li key={category.id}>
              <Link
                href={`/listings?category=${encodeURIComponent(category.slug)}`}
                className="group flex h-full flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center outline-none transition hover:border-primary/40 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="line-clamp-2 text-xs leading-snug font-semibold sm:text-sm">{category.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}