import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false }, // a private page, nothing for search engines
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <RequireVerifiedUser
        next="/checkout"
        loginTitle="Log in to check out"
        loginText="Your cart and addresses are saved to your account."
        verifyText="Confirm your email address to place an order."
      >
        <CheckoutView />
      </RequireVerifiedUser>
    </div>
  );
}