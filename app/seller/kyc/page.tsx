import type { Metadata } from "next";
import { KycView } from "@/components/seller/kyc-view";

export const metadata: Metadata = {
  title: "Verification",
};

export default function SellerKycPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Verification</h1>
        <p className="text-sm text-muted-foreground">Confirm who you are so you can withdraw your earnings.</p>
      </div>

      <KycView />
    </div>
  );
}