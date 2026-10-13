/** Shapes that many endpoints share. */

/**
 * A page of results, as Laravel sends it.
 *
 * Page through results with `meta.current_page` and `meta.last_page` and ask for ?page=N. Do not follow
 * `links`: they are full addresses on the API's own host, not on this site.
 */
export type Paginated<T> = {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    /** Position of the first and last item on this page, or null when the page is empty. */
    from: number | null;
    to: number | null;
    last_page: number;
    per_page: number;
    /** How many results there are in all, across every page. */
    total: number;
    path: string;
  };
};

/** A single record or list, wrapped the way Laravel wraps a bare resource: { data: ... }. */
export type Wrapped<T> = {
  data: T;
};