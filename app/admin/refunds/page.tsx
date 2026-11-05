import type { Metadata } from "next";
import { RefundQueue } from "@/components/admin/refund-queue";

export const metadata: Metadata = {
  title: "Refunds",
};

const STATUSES = ["failed", "needs_attention", "processing", "processed", "all"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type AdminRefundsPageProps = {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
};

export default async function AdminRefundsPage({ searchParams }: AdminRefundsPageProps) {
  const raw = await searchParams;

  // "Failed" when the address names nothing, or names something that is not a real tab.
  const status = STATUSES.find((item) => item === first(raw.status)) ?? "failed";

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Refunds</h1>
        <p className="text-sm text-muted-foreground">Money going back to buyers. Failed ones need a person to look.</p>
      </div>

      <RefundQueue status={status} page={page} />
    </div>
  );
}