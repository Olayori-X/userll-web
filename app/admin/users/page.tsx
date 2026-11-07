import type { Metadata } from "next";
import { UserList } from "@/components/admin/user-list";

export const metadata: Metadata = {
  title: "Users",
};

const TYPES = ["buyer", "seller", "admin"] as const;
const STATUSES = ["active", "suspended"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type AdminUsersPageProps = {
  searchParams: Promise<{
    search?: string | string[];
    type?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const raw = await searchParams;

  // Anything the address says that is not a real filter is ignored, not sent to the API.
  const search = first(raw.search)?.trim().slice(0, 100) || undefined; // the API's limit
  const type = TYPES.find((item) => item === first(raw.type));
  const status = STATUSES.find((item) => item === first(raw.status));

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Everyone with an account, newest first. Open someone to see their record.</p>
      </div>

      <UserList search={search} type={type} status={status} page={page} />
    </div>
  );
}