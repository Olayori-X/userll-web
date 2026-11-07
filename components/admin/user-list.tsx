"use client";

import Form from "next/form";
import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import { useUsers } from "@/hooks/use-admin";
import { formatDay } from "@/lib/dates";
import { toQueryString } from "@/lib/query-string";
import type { AdminUser, UserAccountStatus, UserType } from "@/lib/types/admin-users";
import { cn } from "@/lib/utils";
import { PageNotice, PageSkeleton } from "@/components/layout/require-verified-user";
import { Pagination } from "@/components/listings/pagination";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";

export type UserFilters = {
  search?: string;
  type?: UserType;
  status?: UserAccountStatus;
};

const TYPES: { value: UserType | undefined; label: string }[] = [
  { value: undefined, label: "Everyone" },
  { value: "buyer", label: "Buyers" },
  { value: "seller", label: "Sellers" },
  { value: "admin", label: "Admins" },
];

const STATUSES: { value: UserAccountStatus | undefined; label: string }[] = [
  { value: undefined, label: "Any status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

function usersHref(filters: UserFilters, changes: Partial<UserFilters> = {}, page = 1): string {
  const merged = { ...filters, ...changes };

  return `/admin/users${toQueryString({ search: merged.search, type: merged.type, status: merged.status, page: page > 1 ? page : undefined })}`;
}

const TYPE_LABEL: Record<UserType, string> = { admin: "Admin", seller: "Seller", buyer: "Buyer" };

function Row({ user }: { user: AdminUser }) {
  const suspended = user.status === "suspended";
  const joined = formatDay(user.created_at);

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className="flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
    >
      <Avatar name={user.name} />

      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{user.name}</span>

          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{TYPE_LABEL[user.type]}</span>

          {suspended && (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-destructive">Suspended</span>
          )}
          {!user.email_verified && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">Email not verified</span>
          )}
        </div>

        <p className="truncate text-xs text-muted-foreground">
          {user.email}
          {user.seller && ` · ${user.seller.store_name}`}
        </p>

        {joined && <p className="text-xs text-muted-foreground">Joined {joined}</p>}
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

type UserListProps = UserFilters & { page: number };

/** Find accounts by name or email, and narrow them by type and status. Each row opens the person's record. */
export function UserList({ search, type, status, page }: UserListProps) {
  const filters: UserFilters = { search, type, status };
  const list = useUsers({ search, type, status, page });
  const narrowed = Boolean(search || type || status);

  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
      active ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:border-primary/50",
    );

  return (
    <div className="grid gap-5">
      {/* A plain form: it opens /admin/users?search=..., with no code needed in the browser. */}
      <Form action="/admin/users" role="search" className="flex gap-2">
        {type && <input type="hidden" name="type" value={type} />}
        {status && <input type="hidden" name="status" value={status} />}

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            name="search"
            defaultValue={search}
            maxLength={100} // the API's limit
            placeholder="Search by name or email"
            aria-label="Search by name or email"
            autoComplete="off"
            className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 md:text-sm"
          />
        </div>

        <Button type="submit">Search</Button>
      </Form>

      <div className="grid gap-2">
        <nav aria-label="Filter by type">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {TYPES.map((option) => (
              <li key={option.label} className="shrink-0">
                <Link href={usersHref(filters, { type: option.value })} aria-current={option.value === type ? "page" : undefined} className={chip(option.value === type)}>
                  {option.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Filter by status">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {STATUSES.map((option) => (
              <li key={option.label} className="shrink-0">
                <Link href={usersHref(filters, { status: option.value })} aria-current={option.value === status ? "page" : undefined} className={chip(option.value === status)}>
                  {option.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {search && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm">
          <span className="text-muted-foreground">Matching &ldquo;{search}&rdquo;</span>
          <Link href={usersHref(filters, { search: undefined })} className="font-semibold text-primary hover:underline">
            Clear
          </Link>
        </p>
      )}

      {list.isPending && <PageSkeleton label="Loading accounts" />}

      {list.isError && (
        <Alert variant="error" title="We couldn't load the accounts">
          <Button variant="link" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </Alert>
      )}

      {list.data && list.data.data.length === 0 && (
        <PageNotice icon={<Users className="size-7" aria-hidden />} title={page > 1 ? "Nothing on this page" : "No accounts found"}>
          <p className="max-w-sm text-sm text-muted-foreground">
            {narrowed ? "Nothing matches that. Try fewer filters, or a different spelling." : "There are no accounts on this page."}
          </p>
          {(page > 1 || narrowed) && (
            <Link href={narrowed ? "/admin/users" : usersHref(filters)} className={buttonVariants({ size: "lg" })}>
              {narrowed ? "Clear the filters" : "Back to the first page"}
            </Link>
          )}
        </PageNotice>
      )}

      {list.data && list.data.data.length > 0 && (
        <>
          <ul
            className={cn(
              "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card transition-opacity",
              list.isPlaceholderData && "opacity-60",
            )}
          >
            {list.data.data.map((user) => (
              <li key={user.id}>
                <Row user={user} />
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={list.data.meta.current_page}
            lastPage={list.data.meta.last_page}
            hrefFor={(target) => usersHref(filters, {}, target)}
          />
        </>
      )}
    </div>
  );
}