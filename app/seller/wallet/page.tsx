import type { Metadata } from "next";
import { BankAccountSection } from "@/components/seller/bank-account-form";
import { PayoutHistory } from "@/components/seller/payout-history";
import { WalletOverview } from "@/components/seller/wallet-overview";
import { WithdrawForm } from "@/components/seller/withdraw-form";

export const metadata: Metadata = {
  title: "Wallet",
};

type WalletPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function SellerWalletPage({ searchParams }: WalletPageProps) {
  const raw = await searchParams;

  const value = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const parsed = Number.parseInt(value ?? "", 10);
  const page = Number.isInteger(parsed) && parsed > 1 ? Math.min(parsed, 500) : 1;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">Your earnings, your bank account, and your withdrawals.</p>
      </div>

      <WalletOverview />

      <BankAccountSection />

      <WithdrawForm />

      <PayoutHistory page={page} />
    </div>
  );
}