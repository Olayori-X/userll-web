import type { Metadata } from "next";
import { KycQueue } from "@/components/admin/kyc-queue";

export const metadata: Metadata = {
  title: "Identity checks",
};

const STATUSES = ["pending", "verified", "rejected"] as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type AdminKycPageProps = {
  searchParams: Promise<{ status?: string | string[]; page?: string | string[] }>;
};

export default async function AdminKycPage({ searchParams }: AdminKycPageProps) {
  const raw = await searchParams;

  // Pending when the address names nothing, or names something that is not a real tab.
  const status = STATUSES.find((item) => item === first(raw.status)) ?? "pending";

  const parsed = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Identity checks</h1>
        <p className="text-sm text-muted-foreground">
          Sellers need to be verified before they can withdraw. Check that the name matches the ID, and that the photo is readable.
        </p>
      </div>

      <KycQueue status={status} page={page} />
    </div>
  );
}