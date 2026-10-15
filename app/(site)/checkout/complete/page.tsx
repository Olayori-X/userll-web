import type { Metadata } from "next";
import { PaymentResult } from "@/components/checkout/payment-result";
import { RequireVerifiedUser } from "@/components/layout/require-verified-user";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false }, // a private page, nothing for search engines
};

type CompletePageProps = {
  // Paystack adds its own "trxref" and "reference" to the address as well. We ignore them: only our own
  // checkout reference is used, and the API decides what actually happened.
  searchParams: Promise<{ checkout?: string | string[] }>;
};

export default async function CheckoutCompletePage({ searchParams }: CompletePageProps) {
  const { checkout } = await searchParams;
  const reference = Array.isArray(checkout) ? checkout[0] : checkout;

  // If their login ran out while they were paying, the login page brings them straight back to this same address.
  const here = reference ? `/checkout/complete?checkout=${encodeURIComponent(reference)}` : "/checkout/complete";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RequireVerifiedUser
        next={here}
        loginTitle="Log in to see your payment"
        loginText="Log in with the account you paid with."
        verifyText="Confirm your email address to see your order."
      >
        <PaymentResult reference={reference ?? null} />
      </RequireVerifiedUser>
    </div>
  );
}