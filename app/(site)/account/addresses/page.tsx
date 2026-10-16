import type { Metadata } from "next";
import { AddressBook } from "@/components/account/address-book";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";

export const metadata: Metadata = {
  title: "My addresses",
  robots: { index: false }, // a private page, nothing for search engines
};

export default function AddressesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">My addresses</h1>
      <p className="mb-5 text-sm text-muted-foreground">Where you&apos;d like your orders delivered.</p>

      <RequireVerifiedUser
        next="/account/addresses"
        loginTitle="Log in to see your addresses"
        loginText="Your addresses are saved to your account."
        verifyText="Confirm your email address to manage your addresses."
      >
        <AddressBook />
      </RequireVerifiedUser>
    </div>
  );
}