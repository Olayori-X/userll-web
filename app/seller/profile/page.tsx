import type { Metadata } from "next";
import { ShopProfileView } from "@/components/seller/shop-profile-form";

export const metadata: Metadata = {
  title: "Shop profile",
};

export default function SellerProfilePage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Shop profile</h1>
        <p className="text-sm text-muted-foreground">How your shop looks to buyers.</p>
      </div>

      <ShopProfileView />
    </div>
  );
}