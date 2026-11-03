import type { Metadata } from "next";
import { MoneyOverview, PERIOD_OPTIONS, type PeriodDays } from "@/components/admin/money-overview";
import { NeedsAttention } from "@/components/admin/needs-attention";

export const metadata: Metadata = {
  title: "Overview",
};

type OverviewPageProps = {
  searchParams: Promise<{ days?: string | string[] }>;
};

export default async function AdminOverviewPage({ searchParams }: OverviewPageProps) {
  const raw = await searchParams;
  const value = Array.isArray(raw.days) ? raw.days[0] : raw.days;

  // Only the periods the tabs offer. Anything else in the address falls back to the API's own default of 30 days.
  const days = (PERIOD_OPTIONS.find((option) => String(option.days) === value)?.days ?? 30) as PeriodDays;

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">What needs doing, where the money is, and how the platform is growing.</p>
      </div>

      <NeedsAttention />

      <MoneyOverview days={days} />
    </div>
  );
}