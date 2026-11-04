import type { Metadata } from "next";
import { DisputeQueue } from "@/components/admin/dispute-queue";

export const metadata: Metadata = {
  title: "Disputes",
};

const STATUSES = ["open", "resolved"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type AdminDisputesPageProps = {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
};

export default async function AdminDisputesPage({ searchParams }: AdminDisputesPageProps) {
  const raw = await searchParams;

  // Open when the address names nothing, or names something that is not a real tab.
  const status = STATUSES.find((item) => item === first(raw.status)) ?? "open";

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Disputes</h1>
        <p className="text-sm text-muted-foreground">
          A buyer reported a problem with a shipped order. The seller isn&apos;t paid until it&apos;s decided, so the oldest come first.
        </p>
      </div>

      <DisputeQueue status={status} page={page} />
    </div>
  );
}